-- Remove the obsolete one-item Greetings category and its placeholder Hello record.
-- The full PECS Greetings category is cat-pecs-greetings.

delete from public.learning_items
where id = 'item-hello'
  and category_id = 'cat-greetings'
  and not exists (
    select 1
    from public.learning_items other_item
    where other_item.category_id = 'cat-greetings'
      and other_item.id <> 'item-hello'
  );

delete from public.categories
where id = 'cat-greetings'
  and not exists (
    select 1
    from public.learning_items
    where category_id = 'cat-greetings'
  );

update public.activities
set learning_item_ids = array_replace(learning_item_ids, 'item-hello', 'pecs-hello')
where 'item-hello' = any(learning_item_ids);

insert into public.activity_items (id, activity_id, prompt, answer, options, learning_item_id, position)
select
  'q-match-hello',
  'activity-match',
  'Hello',
  'Hello',
  array['Hello', 'Eat', 'Drink'],
  'pecs-hello',
  0
where exists (select 1 from public.activities where id = 'activity-match')
  and exists (select 1 from public.learning_items where id = 'pecs-hello')
on conflict (id) do nothing;

-- Keep legacy Eat and Drink records usable if they are still present in an
-- existing database while the migrated PECS records remain the canonical source.
update public.learning_items legacy
set symbol_image_url = replacement.symbol_image_url,
    updated_at = now()
from public.learning_items replacement
where legacy.id = 'item-eat'
  and replacement.id = 'pecs-eat'
  and replacement.symbol_image_url is not null;

update public.learning_items legacy
set symbol_image_url = replacement.symbol_image_url,
    updated_at = now()
from public.learning_items replacement
where legacy.id = 'item-drink'
  and replacement.id = 'pecs-drink'
  and replacement.symbol_image_url is not null;
