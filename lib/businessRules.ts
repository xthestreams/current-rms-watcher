// Business Rules Engine
// Define and execute business rules based on opportunity stage changes

import { ProcessedEvent } from '@/types';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    actionTypes?: string[];
    statusChanges?: { from?: string; to: string }[];
  };
  action: (event: ProcessedEvent) => Promise<void>;
  enabled: boolean;
}

class BusinessRulesEngine {
  private rules: Map<string, BusinessRule> = new Map();

  registerRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule);
  }

  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  async executeRules(event: ProcessedEvent): Promise<void> {
    const applicableRules = this.getApplicableRules(event);
    
    for (const rule of applicableRules) {
      if (rule.enabled) {
        try {
          console.log(`Executing rule: ${rule.name} for event ${event.id}`);
          await rule.action(event);
        } catch (error) {
          console.error(`Error executing rule ${rule.name}:`, error);
          throw error;
        }
      }
    }
  }

  private getApplicableRules(event: ProcessedEvent): BusinessRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      // Check if action type matches
      if (rule.trigger.actionTypes && rule.trigger.actionTypes.length > 0) {
        if (!rule.trigger.actionTypes.includes(event.actionType)) {
          return false;
        }
      }

      // Check if status change matches
      if (rule.trigger.statusChanges && rule.trigger.statusChanges.length > 0) {
        const matchesStatusChange = rule.trigger.statusChanges.some(change => {
          const fromMatches = !change.from || change.from === event.previousStatus;
          const toMatches = change.to === event.newStatus;
          return fromMatches && toMatches;
        });
        
        if (!matchesStatusChange) {
          return false;
        }
      }

      return true;
    });
  }
}

// Singleton instance
export const rulesEngine = new BusinessRulesEngine();

// Example business rules (you can customize these)
rulesEngine.registerRule({
  id: 'notify-order-conversion',
  name: 'Notify on Order Conversion',
  description: 'Send notification when opportunity converts to order',
  trigger: {
    actionTypes: ['convert_to_order']
  },
  action: async (event: ProcessedEvent) => {
    console.log(`📧 [RULE] Order conversion notification for Opportunity ${event.opportunityId}`);
    console.log(`   Customer: ${event.customerName}`);
    console.log(`   User: ${event.userName} (ID: ${event.userId})`);
    // Add your notification logic here (email, Slack, etc.)
  },
  enabled: true
});

rulesEngine.registerRule({
  id: 'log-status-changes',
  name: 'Log All Status Changes',
  description: 'Log all opportunity status changes for audit',
  trigger: {
    actionTypes: ['update', 'mark_as_provisional', 'mark_as_reserved', 'mark_as_lost', 'mark_as_dead']
  },
  action: async (event: ProcessedEvent) => {
    console.log(`📝 [RULE] Status change logged for Opportunity ${event.opportunityId}`);
    if (event.previousStatus && event.newStatus) {
      console.log(`   Status: ${event.previousStatus} → ${event.newStatus}`);
    }
    // Add your logging logic here (database, analytics, etc.)
  },
  enabled: true
});

rulesEngine.registerRule({
  id: 'validate-reserved-orders',
  name: 'Validate Reserved Orders',
  description: 'Run validation checks when opportunity is marked as reserved',
  trigger: {
    actionTypes: ['mark_as_reserved']
  },
  action: async (event: ProcessedEvent) => {
    console.log(`✓ [RULE] Validation check for Reserved Opportunity ${event.opportunityId}`);
    // Add your validation logic here
    // - Check inventory availability
    // - Verify pricing
    // - Confirm delivery dates
  },
  enabled: true
});

rulesEngine.registerRule({
  id: 'alert-lost-opportunities',
  name: 'Alert on Lost Opportunities',
  description: 'Send alert when opportunity is marked as lost',
  trigger: {
    actionTypes: ['mark_as_lost']
  },
  action: async (event: ProcessedEvent) => {
    console.log(`⚠️  [RULE] Lost opportunity alert for Opportunity ${event.opportunityId}`);
    console.log(`   Customer: ${event.customerName}`);
    // Add your alert logic here (notify sales team, update CRM, etc.)
  },
  enabled: true
});
