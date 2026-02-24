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
