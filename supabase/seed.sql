with store as (
  select id from public.stores where slug = 'groovydudz'
),
categories as (
  insert into public.categories (store_id, title, slug, description, image_url, position)
  select id, title, slug, description, image_url, position
  from store
  cross join (
    values
      ('Festive decoration', 'festive-decoration', 'Birthday and party decoration kits.', null, 1),
      ('forest theme', 'forest-theme', 'Jungle and safari birthday themes.', null, 2),
      ('Birthday collections', 'birthday-collections', 'Age-wise birthday decoration combos.', null, 3),
      ('Baby Showers', 'baby-showers', 'Mom-to-be and welcome baby kits.', null, 4)
  ) as c(title, slug, description, image_url, position)
  on conflict (store_id, slug) do nothing
  returning id, slug
),
products as (
  insert into public.products (store_id, title, slug, description, status, vendor, product_type, seo, published_at)
  select store.id, p.title, p.slug, p.description, 'active', 'GroovyDudz', p.product_type, '{}'::jsonb, now()
  from store
  cross join (
    values
      ('Astronaut Space Theme Decoration Combo - 50 Pcs', 'astronaut-space-theme-decoration-combo-50-pcs', 'Balloon kit with navy, white and silver balloons, space balloons, birthday banner, silver backdrop and party accessories.', 'Birthday Decoration'),
      ('Jungle Theme 2nd Birthday Decoration Combo - 54 Pcs', 'jungle-theme-2nd-birthday-decoration-combo-54-pcs', 'Safari animals, balloons, banner and party accessories for a forest themed birthday.', 'Birthday Decoration'),
      ('Baby Shower Decoration Kit for Mom To Be', 'baby-shower-decoration-kit-for-mom-to-be', 'Gold baby shower banner, pink and blue balloon arch, baby theme foil balloons and mom-to-be sash.', 'Baby Shower'),
      ('Butterfly Theme Birthday Decoration Kit for Girls', 'butterfly-theme-birthday-decoration-kit-for-girls', 'Pastel pink and purple balloon arch garland with silver chrome balloons and metallic fringe.', 'Birthday Decoration')
  ) as p(title, slug, description, product_type)
  on conflict (store_id, slug) do nothing
  returning id, slug, title
)
insert into public.product_variants (product_id, title, sku, price, compare_at_price, inventory_quantity, weight_grams, options)
select p.id, 'Default', upper(replace(left(p.slug, 18), '-', '')), 499.00, 999.00, 100, 450, '{}'::jsonb
from products p;
