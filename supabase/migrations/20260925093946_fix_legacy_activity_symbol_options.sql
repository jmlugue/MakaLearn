-- Older demo activity rows stored short display codes such as HEL/EAT/DRK.
-- Normalize those seeded questions to the available symbol media so activity
-- previews and scoring use the same values as the content library.

with symbol_urls as (
  select
    coalesce(
      max(symbol_image_url) filter (where id = 'pecs-hello'),
      max(symbol_image_url) filter (where lower(label) = 'hello')
    ) as hello_url,
    coalesce(
      max(symbol_image_url) filter (where id = 'pecs-eat'),
      max(symbol_image_url) filter (where id = 'item-eat'),
      max(symbol_image_url) filter (where lower(label) = 'eat')
    ) as eat_url,
    coalesce(
      max(symbol_image_url) filter (where id = 'pecs-drink'),
      max(symbol_image_url) filter (where id = 'item-drink'),
      max(symbol_image_url) filter (where lower(label) = 'drink')
    ) as drink_url
  from public.learning_items
  where symbol_image_url is not null
)
update public.activity_items
set options = array[symbol_urls.hello_url, symbol_urls.eat_url, symbol_urls.drink_url]
from symbol_urls
where activity_items.id in ('q-match-hello', 'q-match-eat', 'q-choice-drink')
  and symbol_urls.hello_url is not null
  and symbol_urls.eat_url is not null
  and symbol_urls.drink_url is not null;

update public.activity_items
set answer = learning_items.symbol_image_url
from public.learning_items
where activity_items.id in ('q-match-hello', 'q-match-eat', 'q-choice-drink')
  and activity_items.learning_item_id = learning_items.id
  and learning_items.symbol_image_url is not null;
