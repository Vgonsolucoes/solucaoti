-- Adiciona coluna opcional para valor da locação em dispositivos
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS rental_value NUMERIC(12,2) NULL;

-- Opcional: comentário para documentação
COMMENT ON COLUMN public.devices.rental_value IS 'Valor mensal da locação em R$ (opcional)';
