import 'server-only'
import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'research_db'

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient> | undefined = global.__mongoClientPromise

function getClientPromise() {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local before running the app.')
  }

  if (!clientPromise) {
    const client = new MongoClient(uri)
    clientPromise = client.connect()

    if (process.env.NODE_ENV !== 'production') {
      global.__mongoClientPromise = clientPromise
    }
  }

  return clientPromise
}

export async function getDb(): Promise<Db> {
  const connectedClient = await getClientPromise()
  return connectedClient.db(dbName)
}
