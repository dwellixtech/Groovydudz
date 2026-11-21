-- PayU replaces Razorpay as the payment gateway.

insert into public.integration_definitions (provider_key, kind, display_name, description, config_schema)
values
  ('payu', 'payment', 'PayU', 'UPI, cards, net banking and wallets via PayU hosted checkout.', '{"required":["merchant_key"]}'::jsonb)
on conflict (provider_key) do update
  set kind = excluded.kind,
      display_name = excluded.display_name,
      description = excluded.description,
      config_schema = excluded.config_schema,
      is_enabled = true;

update public.integration_definitions
  set is_enabled = false
  where provider_key = 'razorpay';

update public.integration_definitions
  set is_enabled = false
  where provider_key = 'bluedart';

update public.store_policies
  set body = replace(body, 'such as Razorpay', 'such as PayU')
  where body like '%such as Razorpay%';

-- Delhivery replaces BlueDart as the shipping partner.
insert into public.integration_definitions (provider_key, kind, display_name, description, config_schema)
values
  ('delhivery', 'shipping', 'Delhivery', 'PIN code serviceability, shipment manifest, pickups, labels and tracking.', '{"required":["pickup_location"]}'::jsonb)
on conflict (provider_key) do update
  set kind = excluded.kind,
      display_name = excluded.display_name,
      description = excluded.description,
      config_schema = excluded.config_schema,
      is_enabled = true;
