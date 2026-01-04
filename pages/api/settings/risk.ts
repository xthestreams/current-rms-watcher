// API Route: /api/settings/risk
// Fetch and update risk assessment settings

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { RISK_FACTORS } from '@/lib/riskAssessment';

// Default risk settings based on current hardcoded values
function getDefaultRiskSettings() {
  const riskFactors = RISK_FACTORS.map(factor => ({
    id: factor.id,
    label: factor.label,
    weight: factor.weight,
    scale: factor.scale.map(s => ({
      value: s.value,
      label: s.label,
      description: s.description
    }))
  }));

  return {
    risk_factors: riskFactors,
    approval_thresholds: {
      low: { maxScore: 2.0, approver: null, approverName: 'Project Manager' },
      medium: { maxScore: 3.0, approver: null, approverName: 'Senior Manager' },
      high: { maxScore: 4.0, approver: null, approverName: 'Operations Director' },
      critical: { maxScore: 5.0, approver: null, approverName: 'Executive Approval Required' }
    }
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({
      success: false,
      error: 'Database not configured'
    });
  }

  try {
    if (req.method === 'GET') {
      // Fetch current risk settings
      let result;
      try {
        result = await sql`
          SELECT setting_key, setting_value
          FROM risk_settings
          WHERE setting_key IN ('risk_factors', 'approval_thresholds')
        `;
      } catch (dbError: any) {
        // If table doesn't exist, return defaults
        if (dbError?.code === '42P01') {
          console.log('[API] risk_settings table does not exist, returning defaults');
          const defaults = getDefaultRiskSettings();
          return res.status(200).json({
            success: true,
            settings: defaults,
            isDefault: true,
            needsMigration: true
          });
        }
        throw dbError;
      }

      // If no settings exist, return defaults
      if (result.rows.length === 0) {
        const defaults = getDefaultRiskSettings();
        return res.status(200).json({
          success: true,
          settings: defaults,
          isDefault: true
        });
      }

      // Build settings object from database rows
      const settings: Record<string, any> = {};
      for (const row of result.rows) {
        settings[row.setting_key] = row.setting_value;
      }

      // Merge with defaults for any missing keys
      const defaults = getDefaultRiskSettings();
      const mergedSettings = {
        risk_factors: settings.risk_factors || defaults.risk_factors,
        approval_thresholds: settings.approval_thresholds || defaults.approval_thresholds
      };

      return res.status(200).json({
        success: true,
        settings: mergedSettings,
        isDefault: false
      });

    } else if (req.method === 'POST') {
      // Save risk settings
      const { risk_factors, approval_thresholds } = req.body;

      if (!risk_factors && !approval_thresholds) {
        return res.status(400).json({
          success: false,
          error: 'No settings provided'
        });
      }

      const updates = [];

      if (risk_factors) {
        // Upsert risk_factors
        await sql`
          INSERT INTO risk_settings (setting_key, setting_value, updated_at)
          VALUES ('risk_factors', ${JSON.stringify(risk_factors)}::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key)
          DO UPDATE SET
            setting_value = ${JSON.stringify(risk_factors)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        `;
        updates.push('risk_factors');
      }

      if (approval_thresholds) {
        // Upsert approval_thresholds
        await sql`
          INSERT INTO risk_settings (setting_key, setting_value, updated_at)
          VALUES ('approval_thresholds', ${JSON.stringify(approval_thresholds)}::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key)
          DO UPDATE SET
            setting_value = ${JSON.stringify(approval_thresholds)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        `;
        updates.push('approval_thresholds');
      }

      return res.status(200).json({
        success: true,
        message: 'Settings saved successfully',
        updated: updates
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('[API] Error handling risk settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
