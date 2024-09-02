import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  async onModuleInit() {
    this.client = new Client({
      node: process.env.ES_URL, // Update with your Elasticsearch URL
    });

    // Optionally, test the connection on module initialization
    await this.ping();
  }

  public async ping() {
    try {
      await this.client.ping();
      console.log('Elasticsearch cluster is up!');
    } catch (error) {
      console.error('Elasticsearch cluster is down!', error);
    }
  }

  public getClient(): Client {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      console.log('Elasticsearch client connection closed.');
    }
  }
}
