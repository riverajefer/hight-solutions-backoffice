import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  wabaId: process.env.WHATSAPP_WABA_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
  appSecret: process.env.WHATSAPP_APP_SECRET,
  actionSecret: process.env.WHATSAPP_ACTION_SECRET,
}));
