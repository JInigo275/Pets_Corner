INSERT INTO public.services (name, description, category, price_min, price_max, duration_minutes) VALUES
('Basic Grooming', 'Bath, Nails, Paw, Ear, Trim, and Blow Dry', 'grooming', 400.00, 700.00, 360),
('Full Grooming', 'Bath, Nails, Paw, Ear, Trim, Draining, Haircut, Cologne, Blow Dry, and One Chosen Treatment', 'grooming', 500.00, 900.00, 360),
('Nail Trim', 'Nail clipping and filing', 'grooming', 100.00, 100.00, 15),
('Teeth Cleaning', 'Professional dental cleaning', 'grooming', 150.00, 150.00, 30),
('Face Trim', 'Light trimming to look clean and neat', 'grooming', 100.00, 100.00, 60),
('Ear Cleaning', 'Ear canal cleaning', 'grooming', 100.00, 100.00, 60),
('Anal Sac Drain', 'Relieve pressure and discomfort on the anal glands', 'grooming', 150.00, 150.00, 30),
('Pet Boarding', '3 or more comfy days of stay including meals and FREE bath', 'boarding', 400.00, 600.00, 4320);

-- Insert default groomers
INSERT INTO public.groomers (name, specialty) VALUES
('Jocel', 'Groomer'),
('Kenny', 'Groomer');