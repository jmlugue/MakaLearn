alter type public.media_asset_type add value if not exists 'activity-image';

alter table public.learning_items
add column if not exists activity_image_url text;
