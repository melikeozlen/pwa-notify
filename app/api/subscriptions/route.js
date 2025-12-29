import { getAllSubscriptions, loadSubscriptions } from '../subscriptions';
import path from 'path';
import fs from 'fs';

// GET: Tüm subscription'ları listele (debug için)
export async function GET() {
  try {
    const subscriptions = getAllSubscriptions();
    const filePath = path.join(process.cwd(), 'subscriptions.json');
    const fileExists = fs.existsSync(filePath);
    
    let fileContent = null;
    if (fileExists) {
      try {
        fileContent = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        console.error('Dosya okuma hatası:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: subscriptions.length,
        subscriptions: subscriptions,
        filePath: filePath,
        fileExists: fileExists,
        fileContent: fileContent ? JSON.parse(fileContent) : null
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

