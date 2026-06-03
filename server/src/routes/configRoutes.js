import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    currency: process.env.CURRENCY || 'INR',
    farmerSubscriptionAmount: Number(process.env.FARMER_SUBSCRIPTION_AMOUNT || 199),
    customerPlatformFee: Number(process.env.CUSTOMER_PLATFORM_FEE || 15),
    fastDeliveryProvider: process.env.FAST_DELIVERY_PROVIDER || 'Kisan Connect Delivery',
    fastDeliveryEtaMinutes: Number(process.env.FAST_DELIVERY_ETA_MINUTES || 45),
    fastDeliveryPhone: process.env.FAST_DELIVERY_PHONE || '+918880045045',
    supportPhone: process.env.SUPPORT_PHONE || '+918880012345',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@kisanconnect.local',
    supportHours: process.env.SUPPORT_HOURS || 'Every day, 8 AM - 8 PM'
  });
});

export default router;
