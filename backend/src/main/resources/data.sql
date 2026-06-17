INSERT INTO accounts (id, name, account_number, bank_code, currency, balance, created_at) VALUES
  ('acc-001', 'Albion Bank PLC',        '30-91-56 10234567', 'ALBNGB2L', 'GBP', 5000000.00, NOW()),
  ('acc-002', 'Meridian Bank PLC',      '40-47-84 20345678', 'MRDNGB22', 'GBP', 3500000.00, NOW()),
  ('acc-003', 'Crestfield Group PLC',   '60-70-80 30456789', 'CRFTGB2L', 'GBP', 2750000.00, NOW()),
  ('acc-004', 'Harrington PLC',         '11-06-09 40567890', 'HRNGGB21', 'GBP', 4200000.00, NOW()),
  ('acc-005', 'Caledonian Bank',        '80-22-60 50678901', 'CALDGB21', 'GBP', 1800000.00, NOW()),
  ('acc-006', 'Vantage Bank PLC',       '20-32-06 60789012', 'VNTGGB22', 'GBP', 6100000.00, NOW())
ON CONFLICT (id) DO NOTHING;
