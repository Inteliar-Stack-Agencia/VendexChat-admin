-- Enable Realtime for orders table so the admin panel receives live INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
