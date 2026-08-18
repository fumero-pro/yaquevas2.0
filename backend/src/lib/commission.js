'use strict';
// Reparto de la comisión de YaQueVas: 6% al remitente (se suma) + 6% al viajero (se resta).
// Los porcentajes son configurables desde administración (punto 19), pero el valor
// inicial y por defecto es 6% + 6% = 12% total, tal y como exige el prompt maestro.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calculateCommission(basePrice, senderCommissionPct = 6, travelerCommissionPct = 6) {
  const senderFee = round2(basePrice * (senderCommissionPct / 100));
  const travelerFee = round2(basePrice * (travelerCommissionPct / 100));
  const senderTotal = round2(basePrice + senderFee);
  const travelerNet = round2(basePrice - travelerFee);
  const platformCommission = round2(senderFee + travelerFee);

  return {
    base_price: round2(basePrice),
    sender_commission_pct: senderCommissionPct,
    traveler_commission_pct: travelerCommissionPct,
    sender_fee: senderFee,
    traveler_fee: travelerFee,
    sender_total: senderTotal, // lo que paga el remitente
    traveler_net: travelerNet, // lo que cobra el viajero
    platform_commission: platformCommission, // lo que gana YaQueVas
  };
}

module.exports = { calculateCommission };
