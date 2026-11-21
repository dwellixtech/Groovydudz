# Security Notes

- Do not store provider API secrets in `store_integrations.config`.
- Use Supabase RLS for direct database access and FastAPI permission checks for admin workflows.
- Service role keys must only be used server-side.
- Configure production CORS with the final storefront/admin origin only.
- PayU responses and webhooks are hash-verified and re-confirmed with the PayU verify_payment API before an order is marked paid.
- Delhivery and future shipping providers should use idempotency keys for shipment creation.
- Review npm audit advisories before production deployment. The current Vite/Tailwind advisories require breaking major upgrades according to npm audit.
