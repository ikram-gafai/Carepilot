-- Rename legacy FO_VLP perimeter label to FO across operational schemas.

UPDATE care_source.tickets
SET perimeter = 'FO', updated_at = NOW()
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';

UPDATE care_source.km_procedures
SET perimeter = 'FO', updated_at = NOW()
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';

UPDATE cp_agent.tickets
SET perimeter = 'FO', updated_at = NOW()
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';

UPDATE cp_agent.km_references
SET perimeter = 'FO', updated_at = NOW()
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';

UPDATE cp_agent.procedures
SET scope = 'FO', updated_at = NOW()
WHERE scope IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(scope, ' ', ''), '/', '')) = 'FOVLP';

UPDATE ml_training.historical_tickets
SET perimeter = 'FO'
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';

UPDATE ml_training.km_articles
SET perimeter = 'FO'
WHERE perimeter IN ('FO_VLP', 'FO / VLP', 'FO/VLP', 'FO VLP', 'Checkout (VLP)')
   OR upper(replace(replace(perimeter, ' ', ''), '/', '')) = 'FOVLP';
