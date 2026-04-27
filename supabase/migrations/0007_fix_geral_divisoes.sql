-- Reassign all elements from synthetic "Geral" divisão to their correct rooms.
-- These were bulk-assigned to Geral by migration 0005 when divisao_id was NULL.
-- Analysis via Excel confirmed the correct target divisão for each AP.

-- Simple APs (all Geral → single divisão)
update elementos set divisao_id = 5   where divisao_id = 231; -- AP1:  Geral → Suite 2 à esquerda
update elementos set divisao_id = 28  where divisao_id = 226; -- AP3:  Geral → WC Serviço
update elementos set divisao_id = 38  where divisao_id = 225; -- AP4:  Geral → WC de Serviço
update elementos set divisao_id = 61  where divisao_id = 230; -- AP7:  Geral → Suite á direita (escritório)
update elementos set divisao_id = 73  where divisao_id = 223; -- AP8:  Geral → WC de Serviço
update elementos set divisao_id = 103 where divisao_id = 222; -- AP11: Geral → WC de Serviço
update elementos set divisao_id = 113 where divisao_id = 232; -- AP12: Geral → WC de Serviço
update elementos set divisao_id = 177 where divisao_id = 224; -- AP19: Geral → WC de Serviço
update elementos set divisao_id = 187 where divisao_id = 228; -- AP20: Geral → WC de Serviço

-- AP9 split (two missing rooms identified by insertion-order ID ranges)
update elementos set divisao_id = 85 where id between 796 and 815 and divisao_id = 229;  -- WC de Serviço
update elementos set divisao_id = 79 where id between 859 and 878 and divisao_id = 229;  -- Suite 2 à esquerda

-- AP17 split
update elementos set divisao_id = 159 where id between 2060 and 2080 and divisao_id = 227; -- WC de Serviço
update elementos set divisao_id = 153 where id between 2125 and 2143 and divisao_id = 227; -- Suite 2 à esquerda

-- Remove the now-empty Geral divisões
delete from divisoes where nome = 'Geral';
