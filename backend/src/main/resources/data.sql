INSERT INTO accounts (id, name, account_number, bank_code, currency, balance, created_at) VALUES
  ('acc-001', 'Lloyds Bank PLC',        '30-91-56 10234567', 'LOYDGB2L', 'GBP', 5000000.00, NOW()),
  ('acc-002', 'HSBC UK Bank PLC',       '40-47-84 20345678', 'MIDLGB22', 'GBP', 3500000.00, NOW()),
  ('acc-003', 'NatWest Group PLC',      '60-70-80 30456789', 'NWBKGB2L', 'GBP', 2750000.00, NOW()),
  ('acc-004', 'Halifax PLC',            '11-06-09 40567890', 'HLFXGB21', 'GBP', 4200000.00, NOW()),
  ('acc-005', 'Bank of Scotland',       '80-22-60 50678901', 'BOFSGB21', 'GBP', 1800000.00, NOW()),
  ('acc-006', 'Barclays Bank PLC',      '20-32-06 60789012', 'BARCGB22', 'GBP', 6100000.00, NOW())
ON CONFLICT (id) DO NOTHING;
