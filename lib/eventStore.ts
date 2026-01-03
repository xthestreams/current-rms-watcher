// Event store with /tmp file persistence
// Survives across serverless function invocations (until container is recycled)

import { ProcessedEvent, HealthMetrics } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_FILE = path.join('/tmp', 'events.json');
const METADATA_FILE = path.join('/tmp', 'metadata.json');

interface StorageData {
  events: ProcessedEvent[];
}

interface MetadataData {
  startTime: number;
}

class EventStore {
  private events: ProcessedEvent[] = [];
  private startTime: number = Date.now();
  private maxEvents: number = 1000; // Keep last 1000 events
  private loaded: boolean = false;

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    // Always reload from file to get latest data across instances
    try {
      // Load events
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        const parsed: StorageData = JSON.parse(data);
        this.events = parsed.events || [];
        console.log(`[EventStore] Loaded ${this.events.length} events from file`);
      } else {
        console.log('[EventStore] No storage file found, starting fresh');
      }

      // Load metadata
      if (fs.existsSync(METADATA_FILE)) {
        const metaData = fs.readFileSync(METADATA_FILE, 'utf8');
        const parsed: MetadataData = JSON.parse(metaData);
        this.startTime = parsed.startTime || Date.now();
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading events from file:', error);
      this.events = [];
      this.startTime = Date.now();
    }
  }

  private saveToFile(): void {
    try {
      // Save events
      const storageData: StorageData = {
        events: this.events
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageData), 'utf8');

      // Save metadata
      const metadataData: MetadataData = {
        startTime: this.startTime
      };
      fs.writeFileSync(METADATA_FILE, JSON.stringify(metadataData), 'utf8');
    } catch (error) {
      console.error('Error saving events to file:', error);
    }
  }

  addEvent(event: ProcessedEvent): void {
    this.loadFromFile(); // Ensure we have latest data
    this.events.unshift(event); // Add to beginning

    // Trim to max size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    this.saveToFile();
  }

  getRecentEvents(limit: number = 50): ProcessedEvent[] {
    this.loadFromFile();
    return this.events.slice(0, limit);
  }

  getEventById(id: string): ProcessedEvent | undefined {
    this.loadFromFile();
    return this.events.find(e => e.id === id);
  }

  getMetrics(): HealthMetrics {
    this.loadFromFile();
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
    this.loadFromFile();
    return this.events.filter(e => e.opportunityId === opportunityId);
  }

  clearEvents(): void {
    this.events = [];
    this.saveToFile();
  }
}

// Singleton instance
export const eventStore = new EventStore();
