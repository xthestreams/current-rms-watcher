// In-memory event store
// For production, replace with a persistent database (PostgreSQL, MongoDB, etc.)

import { ProcessedEvent, HealthMetrics } from '@/types';

class EventStore {
  private events: ProcessedEvent[] = [];
  private startTime: number = Date.now();
  private maxEvents: number = 1000; // Keep last 1000 events in memory

  addEvent(event: ProcessedEvent): void {
    this.events.unshift(event); // Add to beginning
    
    // Trim to max size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  getRecentEvents(limit: number = 50): ProcessedEvent[] {
    return this.events.slice(0, limit);
  }

  getEventById(id: string): ProcessedEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  getMetrics(): HealthMetrics {
    const totalEvents = this.events.length;
    const successfulEvents = this.events.filter(e => e.processed && !e.error).length;
    const failedEvents = this.events.filter(e => e.error).length;
    const lastEventTime = this.events.length > 0 ? this.events[0].timestamp : undefined;
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      lastEventTime,
      uptime
    };
  }

  getEventsByOpportunity(opportunityId: number): ProcessedEvent[] {
    return this.events.filter(e => e.opportunityId === opportunityId);
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance
export const eventStore = new EventStore();
