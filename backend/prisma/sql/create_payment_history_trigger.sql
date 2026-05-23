-- DBMS trigger: automatically record the first payment when a subscription is created.
-- Run this in Supabase SQL Editor after your tables exist.

CREATE OR REPLACE FUNCTION create_initial_payment_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payment_history (
    subscription_id,
    amount_paid,
    payment_date,
    notes
  )
  VALUES (
    NEW.id,
    NEW.cost,
    CURRENT_DATE,
    'Initial subscription payment created by trigger'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_initial_payment_history ON subscriptions;

CREATE TRIGGER trg_create_initial_payment_history
AFTER INSERT ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION create_initial_payment_history();
