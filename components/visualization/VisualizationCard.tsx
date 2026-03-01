'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dataset } from '@/types/dataset';
import { Card, CardContent } from '@/components/ui/card';

function DashboardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </CardContent>
    </Card>
  );
}

const dashboards: Record<string, React.ComponentType<any>> = {
  PopulationDashboard: dynamic(() => import('@/components/charts/PopulationDashboard').then(m => ({ default: m.PopulationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PopulationByDistrictsDashboard: dynamic(() => import('@/components/charts/PopulationByDistrictsDashboard').then(m => ({ default: m.PopulationByDistrictsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  VitalStatisticsDashboard: dynamic(() => import('@/components/charts/VitalStatisticsDashboard').then(m => ({ default: m.VitalStatisticsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  BirthsDashboard: dynamic(() => import('@/components/charts/BirthsDashboard').then(m => ({ default: m.BirthsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MortalityDashboard: dynamic(() => import('@/components/charts/MortalityDashboard').then(m => ({ default: m.MortalityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  WeeklyMortalityDashboard: dynamic(() => import('@/components/charts/WeeklyMortalityDashboard').then(m => ({ default: m.WeeklyMortalityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MarriagesDashboard: dynamic(() => import('@/components/charts/MarriagesDashboard').then(m => ({ default: m.MarriagesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  DivorcesDashboard: dynamic(() => import('@/components/charts/DivorcesDashboard').then(m => ({ default: m.DivorcesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MortalityRatesDashboard: dynamic(() => import('@/components/charts/MortalityRatesDashboard').then(m => ({ default: m.MortalityRatesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ActivityRatesDashboard: dynamic(() => import('@/components/charts/ActivityRatesDashboard').then(m => ({ default: m.ActivityRatesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ActivityRatesRegionalDashboard: dynamic(() => import('@/components/charts/ActivityRatesRegionalDashboard').then(m => ({ default: m.ActivityRatesRegionalDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ActivityRatesEducationDashboard: dynamic(() => import('@/components/charts/ActivityRatesEducationDashboard').then(m => ({ default: m.ActivityRatesEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ActivityRatesResidenceDashboard: dynamic(() => import('@/components/charts/ActivityRatesResidenceDashboard').then(m => ({ default: m.ActivityRatesResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesRegionalDashboard: dynamic(() => import('@/components/charts/EmploymentRatesRegionalDashboard').then(m => ({ default: m.EmploymentRatesRegionalDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRates2064Dashboard: dynamic(() => import('@/components/charts/EmploymentRates2064Dashboard').then(m => ({ default: m.EmploymentRates2064Dashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesByAgeDashboard: dynamic(() => import('@/components/charts/EmploymentRatesByAgeDashboard').then(m => ({ default: m.EmploymentRatesByAgeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesByEducationDashboard: dynamic(() => import('@/components/charts/EmploymentRatesByEducationDashboard').then(m => ({ default: m.EmploymentRatesByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesByResidenceDashboard: dynamic(() => import('@/components/charts/EmploymentRatesByResidenceDashboard').then(m => ({ default: m.EmploymentRatesByResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesAnnualDashboard: dynamic(() => import('@/components/charts/EmploymentRatesAnnualDashboard').then(m => ({ default: m.EmploymentRatesAnnualDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmploymentRatesAllRegionsDashboard: dynamic(() => import('@/components/charts/EmploymentRatesAllRegionsDashboard').then(m => ({ default: m.EmploymentRatesAllRegionsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedPersonsRegionalDashboard: dynamic(() => import('@/components/charts/EmployedPersonsRegionalDashboard').then(m => ({ default: m.EmployedPersonsRegionalDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedPersons2064Dashboard: dynamic(() => import('@/components/charts/EmployedPersons2064Dashboard').then(m => ({ default: m.EmployedPersons2064Dashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByAgeSexDashboard: dynamic(() => import('@/components/charts/EmployedByAgeSexDashboard').then(m => ({ default: m.EmployedByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByActivityDashboard: dynamic(() => import('@/components/charts/EmployedByActivityDashboard').then(m => ({ default: m.EmployedByActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByActivity2008Dashboard: dynamic(() => import('@/components/charts/EmployedByActivity2008Dashboard').then(m => ({ default: m.EmployedByActivity2008Dashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByEducationLevelDashboard: dynamic(() => import('@/components/charts/EmployedByEducationLevelDashboard').then(m => ({ default: m.EmployedByEducationLevelDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByOccupationDashboard: dynamic(() => import('@/components/charts/EmployedByOccupationDashboard').then(m => ({ default: m.EmployedByOccupationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByProfStatusDashboard: dynamic(() => import('@/components/charts/EmployedByProfStatusDashboard').then(m => ({ default: m.EmployedByProfStatusDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByResidenceSexDashboard: dynamic(() => import('@/components/charts/EmployedByResidenceSexDashboard').then(m => ({ default: m.EmployedByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByOwnershipDashboard: dynamic(() => import('@/components/charts/EmployedByOwnershipDashboard').then(m => ({ default: m.EmployedByOwnershipDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployedByPermanencyDashboard: dynamic(() => import('@/components/charts/EmployedByPermanencyDashboard').then(m => ({ default: m.EmployedByPermanencyDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployeesByResidenceDashboard: dynamic(() => import('@/components/charts/EmployeesByResidenceDashboard').then(m => ({ default: m.EmployeesByResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployeesBySexDashboard: dynamic(() => import('@/components/charts/EmployeesBySexDashboard').then(m => ({ default: m.EmployeesBySexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployeesByContractDashboard: dynamic(() => import('@/components/charts/EmployeesByContractDashboard').then(m => ({ default: m.EmployeesByContractDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployeesByWorkingTimeDashboard: dynamic(() => import('@/components/charts/EmployeesByWorkingTimeDashboard').then(m => ({ default: m.EmployeesByWorkingTimeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  EmployeesLabourContractNaceDashboard: dynamic(() => import('@/components/charts/EmployeesLabourContractNaceDashboard').then(m => ({ default: m.EmployeesLabourContractNaceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LongTermUnemploymentRateDashboard: dynamic(() => import('@/components/charts/LongTermUnemploymentRateDashboard').then(m => ({ default: m.LongTermUnemploymentRateDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByAgeSexDashboard: dynamic(() => import('@/components/charts/UnemployedByAgeSexDashboard').then(m => ({ default: m.UnemployedByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByDurationSexDashboard: dynamic(() => import('@/components/charts/UnemployedByDurationSexDashboard').then(m => ({ default: m.UnemployedByDurationSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByExperienceDashboard: dynamic(() => import('@/components/charts/UnemployedByExperienceDashboard').then(m => ({ default: m.UnemployedByExperienceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByEducationDashboard: dynamic(() => import('@/components/charts/UnemployedByEducationDashboard').then(m => ({ default: m.UnemployedByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByJobSearchDashboard: dynamic(() => import('@/components/charts/UnemployedByJobSearchDashboard').then(m => ({ default: m.UnemployedByJobSearchDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByResidenceSexDashboard: dynamic(() => import('@/components/charts/UnemployedByResidenceSexDashboard').then(m => ({ default: m.UnemployedByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemployedByRegionsSexDashboard: dynamic(() => import('@/components/charts/UnemployedByRegionsSexDashboard').then(m => ({ default: m.UnemployedByRegionsSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesByAgeSexDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesByAgeSexDashboard').then(m => ({ default: m.UnemploymentRatesByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesByEducationDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesByEducationDashboard').then(m => ({ default: m.UnemploymentRatesByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesByResidenceSexDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesByResidenceSexDashboard').then(m => ({ default: m.UnemploymentRatesByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesAnnualDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesAnnualDashboard').then(m => ({ default: m.UnemploymentRatesAnnualDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesRegionalAnnualDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesRegionalAnnualDashboard').then(m => ({ default: m.UnemploymentRatesRegionalAnnualDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  UnemploymentRatesRegionalQuarterlyDashboard: dynamic(() => import('@/components/charts/UnemploymentRatesRegionalQuarterlyDashboard').then(m => ({ default: m.UnemploymentRatesRegionalQuarterlyDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LabourForceByAgeSexDashboard: dynamic(() => import('@/components/charts/LabourForceByAgeSexDashboard').then(m => ({ default: m.LabourForceByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LabourForceByEducationDashboard: dynamic(() => import('@/components/charts/LabourForceByEducationDashboard').then(m => ({ default: m.LabourForceByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LabourForceByResidenceSexDashboard: dynamic(() => import('@/components/charts/LabourForceByResidenceSexDashboard').then(m => ({ default: m.LabourForceByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LabourForceByRegionsSexDashboard: dynamic(() => import('@/components/charts/LabourForceByRegionsSexDashboard').then(m => ({ default: m.LabourForceByRegionsSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NotInLFByAgeSexDashboard: dynamic(() => import('@/components/charts/NotInLFByAgeSexDashboard').then(m => ({ default: m.NotInLFByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NotInLFByEducationDashboard: dynamic(() => import('@/components/charts/NotInLFByEducationDashboard').then(m => ({ default: m.NotInLFByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NotInLFByResidenceSexDashboard: dynamic(() => import('@/components/charts/NotInLFByResidenceSexDashboard').then(m => ({ default: m.NotInLFByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NotInLFByReasonsDashboard: dynamic(() => import('@/components/charts/NotInLFByReasonsDashboard').then(m => ({ default: m.NotInLFByReasonsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NotInLFByRegionsSexDashboard: dynamic(() => import('@/components/charts/NotInLFByRegionsSexDashboard').then(m => ({ default: m.NotInLFByRegionsSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  DiscouragedByAgeSexDashboard: dynamic(() => import('@/components/charts/DiscouragedByAgeSexDashboard').then(m => ({ default: m.DiscouragedByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  DiscouragedByEducationDashboard: dynamic(() => import('@/components/charts/DiscouragedByEducationDashboard').then(m => ({ default: m.DiscouragedByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  DiscouragedByResidenceSexDashboard: dynamic(() => import('@/components/charts/DiscouragedByResidenceSexDashboard').then(m => ({ default: m.DiscouragedByResidenceSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  WagesByActivityOwnershipDashboard: dynamic(() => import('@/components/charts/WagesByActivityOwnershipDashboard').then(m => ({ default: m.WagesByActivityOwnershipDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  AvgHoursByOwnershipDashboard: dynamic(() => import('@/components/charts/AvgHoursByOwnershipDashboard').then(m => ({ default: m.AvgHoursByOwnershipDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  AvgHoursBySexDashboard: dynamic(() => import('@/components/charts/AvgHoursBySexDashboard').then(m => ({ default: m.AvgHoursBySexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateBeforeTransfersDashboard: dynamic(() => import('@/components/charts/PovertyRateBeforeTransfersDashboard').then(m => ({ default: m.PovertyRateBeforeTransfersDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateInclPensionsDashboard: dynamic(() => import('@/components/charts/PovertyRateInclPensionsDashboard').then(m => ({ default: m.PovertyRateInclPensionsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateByAgeSexDashboard: dynamic(() => import('@/components/charts/PovertyRateByAgeSexDashboard').then(m => ({ default: m.PovertyRateByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateByHouseholdDashboard: dynamic(() => import('@/components/charts/PovertyRateByHouseholdDashboard').then(m => ({ default: m.PovertyRateByHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateByActivityDashboard: dynamic(() => import('@/components/charts/PovertyRateByActivityDashboard').then(m => ({ default: m.PovertyRateByActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyRateElderlyDashboard: dynamic(() => import('@/components/charts/PovertyRateElderlyDashboard').then(m => ({ default: m.PovertyRateElderlyDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PovertyThresholdDashboard: dynamic(() => import('@/components/charts/PovertyThresholdDashboard').then(m => ({ default: m.PovertyThresholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InWorkPovertyByAgeSexDashboard: dynamic(() => import('@/components/charts/InWorkPovertyByAgeSexDashboard').then(m => ({ default: m.InWorkPovertyByAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InWorkPovertyByEducationDashboard: dynamic(() => import('@/components/charts/InWorkPovertyByEducationDashboard').then(m => ({ default: m.InWorkPovertyByEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InWorkPovertyByWorkingTimeDashboard: dynamic(() => import('@/components/charts/InWorkPovertyByWorkingTimeDashboard').then(m => ({ default: m.InWorkPovertyByWorkingTimeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InWorkPovertyByHouseholdDashboard: dynamic(() => import('@/components/charts/InWorkPovertyByHouseholdDashboard').then(m => ({ default: m.InWorkPovertyByHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RiskPovertyExclusionAgeSexDashboard: dynamic(() => import('@/components/charts/RiskPovertyExclusionAgeSexDashboard').then(m => ({ default: m.RiskPovertyExclusionAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RiskPovertyExclusionEducationDashboard: dynamic(() => import('@/components/charts/RiskPovertyExclusionEducationDashboard').then(m => ({ default: m.RiskPovertyExclusionEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RiskPovertyExclusionHouseholdDashboard: dynamic(() => import('@/components/charts/RiskPovertyExclusionHouseholdDashboard').then(m => ({ default: m.RiskPovertyExclusionHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RiskPovertyExclusionActivityDashboard: dynamic(() => import('@/components/charts/RiskPovertyExclusionActivityDashboard').then(m => ({ default: m.RiskPovertyExclusionActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MaterialDeprivationDashboard: dynamic(() => import('@/components/charts/MaterialDeprivationDashboard').then(m => ({ default: m.MaterialDeprivationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MaterialDeprivationByHouseholdDashboard: dynamic(() => import('@/components/charts/MaterialDeprivationByHouseholdDashboard').then(m => ({ default: m.MaterialDeprivationByHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MaterialDeprivationByActivityDashboard: dynamic(() => import('@/components/charts/MaterialDeprivationByActivityDashboard').then(m => ({ default: m.MaterialDeprivationByActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LowWorkIntensityAgeSexDashboard: dynamic(() => import('@/components/charts/LowWorkIntensityAgeSexDashboard').then(m => ({ default: m.LowWorkIntensityAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LowWorkIntensityEducationDashboard: dynamic(() => import('@/components/charts/LowWorkIntensityEducationDashboard').then(m => ({ default: m.LowWorkIntensityEducationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LowWorkIntensityHouseholdDashboard: dynamic(() => import('@/components/charts/LowWorkIntensityHouseholdDashboard').then(m => ({ default: m.LowWorkIntensityHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  LowWorkIntensityActivityDashboard: dynamic(() => import('@/components/charts/LowWorkIntensityActivityDashboard').then(m => ({ default: m.LowWorkIntensityActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MonetaryPovertyRateDashboard: dynamic(() => import('@/components/charts/MonetaryPovertyRateDashboard').then(m => ({ default: m.MonetaryPovertyRateDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MonetaryPovertyRateRegionalDashboard: dynamic(() => import('@/components/charts/MonetaryPovertyRateRegionalDashboard').then(m => ({ default: m.MonetaryPovertyRateRegionalDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MonetaryPovertyRateNutsAgeDashboard: dynamic(() => import('@/components/charts/MonetaryPovertyRateNutsAgeDashboard').then(m => ({ default: m.MonetaryPovertyRateNutsAgeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  IncomeDistributionDecilesDashboard: dynamic(() => import('@/components/charts/IncomeDistributionDecilesDashboard').then(m => ({ default: m.IncomeDistributionDecilesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MeanMedianIncomeAgeSexDashboard: dynamic(() => import('@/components/charts/MeanMedianIncomeAgeSexDashboard').then(m => ({ default: m.MeanMedianIncomeAgeSexDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MeanMedianIncomeHouseholdDashboard: dynamic(() => import('@/components/charts/MeanMedianIncomeHouseholdDashboard').then(m => ({ default: m.MeanMedianIncomeHouseholdDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MeanMedianIncomeActivityDashboard: dynamic(() => import('@/components/charts/MeanMedianIncomeActivityDashboard').then(m => ({ default: m.MeanMedianIncomeActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RelativeMedianIncomeRatioDashboard: dynamic(() => import('@/components/charts/RelativeMedianIncomeRatioDashboard').then(m => ({ default: m.RelativeMedianIncomeRatioDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  TotalIncomeBySourceResidenceDashboard: dynamic(() => import('@/components/charts/TotalIncomeBySourceResidenceDashboard').then(m => ({ default: m.TotalIncomeBySourceResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  FoodConsumptionDashboard: dynamic(() => import('@/components/charts/FoodConsumptionDashboard').then(m => ({ default: m.FoodConsumptionDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MonetaryExpenditureResidenceDashboard: dynamic(() => import('@/components/charts/MonetaryExpenditureResidenceDashboard').then(m => ({ default: m.MonetaryExpenditureResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MonetaryIncomeResidenceDashboard: dynamic(() => import('@/components/charts/MonetaryIncomeResidenceDashboard').then(m => ({ default: m.MonetaryIncomeResidenceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ChildrenInKindergartensDashboard: dynamic(() => import('@/components/charts/ChildrenInKindergartensDashboard').then(m => ({ default: m.ChildrenInKindergartensDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  TeachingStaffKindergartensDashboard: dynamic(() => import('@/components/charts/TeachingStaffKindergartensDashboard').then(m => ({ default: m.TeachingStaffKindergartensDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PopulationByEducationLevelDashboard: dynamic(() => import('@/components/charts/PopulationByEducationLevelDashboard').then(m => ({ default: m.PopulationByEducationLevelDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  HealthEstablishmentsDashboard: dynamic(() => import('@/components/charts/HealthEstablishmentsDashboard').then(m => ({ default: m.HealthEstablishmentsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MedicalPersonnelDashboard: dynamic(() => import('@/components/charts/MedicalPersonnelDashboard').then(m => ({ default: m.MedicalPersonnelDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  FdiByEconomicActivityDashboard: dynamic(() => import('@/components/charts/FdiByEconomicActivityDashboard').then(m => ({ default: m.FdiByEconomicActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  FdiByRegionDashboard: dynamic(() => import('@/components/charts/FdiByRegionDashboard').then(m => ({ default: m.FdiByRegionDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  BusinessIndicatorsByActivityDashboard: dynamic(() => import('@/components/charts/BusinessIndicatorsByActivityDashboard').then(m => ({ default: m.BusinessIndicatorsByActivityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  BusinessIndicatorsBySizeRegionsDashboard: dynamic(() => import('@/components/charts/BusinessIndicatorsBySizeRegionsDashboard').then(m => ({ default: m.BusinessIndicatorsBySizeRegionsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  ProdcomDashboard: dynamic(() => import('@/components/charts/ProdcomDashboard').then(m => ({ default: m.ProdcomDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  BuildingPermitsDashboard: dynamic(() => import('@/components/charts/BuildingPermitsDashboard').then(m => ({ default: m.BuildingPermitsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  RetailOutletsDashboard: dynamic(() => import('@/components/charts/RetailOutletsDashboard').then(m => ({ default: m.RetailOutletsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  AccommodationEstablishmentsDashboard: dynamic(() => import('@/components/charts/AccommodationEstablishmentsDashboard').then(m => ({ default: m.AccommodationEstablishmentsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  VisitorsInBulgariaDashboard: dynamic(() => import('@/components/charts/VisitorsInBulgariaDashboard').then(m => ({ default: m.VisitorsInBulgariaDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  NightsByForeignersDashboard: dynamic(() => import('@/components/charts/NightsByForeignersDashboard').then(m => ({ default: m.NightsByForeignersDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  BulgarianTripsAbroadDashboard: dynamic(() => import('@/components/charts/BulgarianTripsAbroadDashboard').then(m => ({ default: m.BulgarianTripsAbroadDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  MuseumsDashboard: dynamic(() => import('@/components/charts/MuseumsDashboard').then(m => ({ default: m.MuseumsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InsuranceBalanceDashboard: dynamic(() => import('@/components/charts/InsuranceBalanceDashboard').then(m => ({ default: m.InsuranceBalanceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InsuranceProfitLossDashboard: dynamic(() => import('@/components/charts/InsuranceProfitLossDashboard').then(m => ({ default: m.InsuranceProfitLossDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PensionCompaniesBalanceDashboard: dynamic(() => import('@/components/charts/PensionCompaniesBalanceDashboard').then(m => ({ default: m.PensionCompaniesBalanceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PensionFundsBalanceDashboard: dynamic(() => import('@/components/charts/PensionFundsBalanceDashboard').then(m => ({ default: m.PensionFundsBalanceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PensionCompaniesIncomeDashboard: dynamic(() => import('@/components/charts/PensionCompaniesIncomeDashboard').then(m => ({ default: m.PensionCompaniesIncomeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  PensionFundsIncomeDashboard: dynamic(() => import('@/components/charts/PensionFundsIncomeDashboard').then(m => ({ default: m.PensionFundsIncomeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InvestmentCompaniesBalanceDashboard: dynamic(() => import('@/components/charts/InvestmentCompaniesBalanceDashboard').then(m => ({ default: m.InvestmentCompaniesBalanceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  InvestmentCompaniesIncomeDashboard: dynamic(() => import('@/components/charts/InvestmentCompaniesIncomeDashboard').then(m => ({ default: m.InvestmentCompaniesIncomeDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  AssociationsBalanceDashboard: dynamic(() => import('@/components/charts/AssociationsBalanceDashboard').then(m => ({ default: m.AssociationsBalanceDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
  AssociationsProfitLossDashboard: dynamic(() => import('@/components/charts/AssociationsProfitLossDashboard').then(m => ({ default: m.AssociationsProfitLossDashboard })), { loading: () => <DashboardSkeleton />, ssr: false }),
};

interface VisualizationCardProps {
  dataset: Dataset;
  locale: 'bg' | 'en';
}

export function VisualizationCard({ dataset, locale }: VisualizationCardProps) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/data/${dataset.id}?locale=${locale}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result.data.data.rows);
      } catch (err) {
        console.error('Error fetching dataset:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dataset.id, locale]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p className="font-medium mb-2">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const Dashboard = dataset.customVisualization ? dashboards[dataset.customVisualization] : null;

  if (!Dashboard) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No visualization available for this dataset</p>
        </CardContent>
      </Card>
    );
  }

  return <Dashboard data={data} dataset={dataset} locale={locale} />;
}
