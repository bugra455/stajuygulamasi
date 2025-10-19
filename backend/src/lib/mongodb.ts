import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stajkontrol_logs';

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI, {
        // Connection pool settings - reliability optimized for logging
        maxPoolSize: 2,        // Small pool for reliability
        // minPoolSize removed - let it scale down to 0 when idle
        // Reconnection settings - increased timeouts for stability
        maxIdleTimeMS: 60000,  // Keep connections alive longer
        serverSelectionTimeoutMS: 15000, // Wait longer for server selection
        socketTimeoutMS: 60000,          // Wait longer for socket operations
        connectTimeoutMS: 15000,         // Connection timeout
        // Network reliability
        family: 4, // Use IPv4, skip trying IPv6
        // Additional reliability settings
        retryWrites: true,
        w: 'majority',  // Write concern for reliability
      });

      this.isConnected = true;
      console.log('✅ MongoDB bağlantısı başarılı:', MONGODB_URI);

      mongoose.connection.on('error', (error: unknown) => {
        const err = error as Error;
        console.error('❌ MongoDB bağlantı hatası:', err.message);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB bağlantısı kesildi');
        this.isConnected = false;
        
        // Attempt reconnection after network change
        setTimeout(async () => {
          if (!this.isConnected) {
            console.log('🔄 MongoDB yeniden bağlantı deneniyor...');
            try {
              await this.connect();
            } catch (reconnectError) {
              console.error('❌ MongoDB yeniden bağlantı başarısız:', reconnectError);
            }
          }
        }, 5000); // Wait 5 seconds before reconnecting
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB yeniden bağlandı');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ MongoDB bağlantı hatası:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ MongoDB bağlantısı kapatıldı');
    } catch (error) {
      console.error('❌ MongoDB bağlantı kapatma hatası:', error);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default MongoDBConnection;
