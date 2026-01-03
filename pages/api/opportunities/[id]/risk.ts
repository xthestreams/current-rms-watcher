// API Route: /api/opportunities/[id]/risk
// Update risk assessment for an opportunity in Current RMS

import { NextApiRequest, NextApiResponse } from 'next';
import { RiskAssessmentData, validateRiskScores, calculateRiskScore, getRiskLevel } from '@/lib/riskAssessment';

const SUBDOMAIN = process.env.CURRENT_RMS_SUBDOMAIN;
const API_KEY = process.env.CURRENT_RMS_API_KEY;
const BASE_URL = 'https://api.current-rms.com/api/v1';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const riskData: RiskAssessmentData = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid opportunity ID' });
  }

  // Validate risk data
  if (!riskData) {
    return res.status(400).json({ error: 'Risk assessment data is required' });
  }

  // Validate risk scores using library function
  if (!validateRiskScores(riskData)) {
    return res.status(400).json({
      error: 'Invalid risk scores',
      details: 'All risk scores must be integers between 1 and 5'
    });
  }

  // Recalculate risk score to ensure consistency
  const calculatedScore = calculateRiskScore(riskData);
  const riskLevel = getRiskLevel(calculatedScore);

  // Update risk data with calculated values
  riskData.risk_score = calculatedScore;
  riskData.risk_level = riskLevel || '';

  if (!SUBDOMAIN || !API_KEY) {
    console.error('Missing Current RMS credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Update opportunity custom fields in Current RMS
    const url = `${BASE_URL}/opportunities/${id}`;

    console.log(`[RiskAPI] Updating risk assessment for opportunity ${id}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'X-SUBDOMAIN': SUBDOMAIN,
        'X-AUTH-TOKEN': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        opportunity: {
          custom_fields: riskData
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RiskAPI] Current RMS API error (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: 'Failed to update risk assessment in Current RMS',
        details: errorText
      });
    }

    const updatedOpportunity = await response.json();
    console.log(`[RiskAPI] Successfully updated risk assessment for opportunity ${id}`);

    return res.status(200).json({
      success: true,
      opportunity: updatedOpportunity
    });

  } catch (error) {
    console.error('[RiskAPI] Error updating risk assessment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
