import React, { useState, useCallback } from 'react';
import type { SimulationParams, SimulationState, SimulationResult, TeamMember, AnalysisResult, AnalysisDataPoint } from './types';
import { MemberStatus, AnalysisType } from './types';
import SimulationControls from './components/SimulationControls';
import AnalysisChart from './components/AnalysisChart';

const DEFAULT_PARAMS: SimulationParams = {
  teamSize: 10,
  resources: 10,
  minHoldTime: 5,
  duration: 365,
  defaultIdeaProbability: 0.01,
  members: Array.from({ length: 10 }, () => ({ outputRate: 10 })),
};

const runSingleSimulation = (currentParams: SimulationParams): SimulationResult => {
  const initialTeam: TeamMember[] = currentParams.members.map((m, i) => ({
    id: i + 1,
    outputRate: m.outputRate,
    ideaProbability: currentParams.defaultIdeaProbability,
    status: MemberStatus.IDLE,
    resourceHeldSince: -1,
    daysWithResource: 0,
  }));

  const state: SimulationState = {
    day: 0,
    team: initialTeam,
    queue: [],
    working: [],
    totalOutput: 0,
  };

  for (let day = 0; day < currentParams.duration; day++) {
    state.day++;

    // 1. Idea Generation
    state.team.forEach(member => {
      if (member.status === MemberStatus.IDLE && Math.random() <= member.ideaProbability) {
        member.status = MemberStatus.WAITING;
        if (!state.queue.includes(member.id)) {
            state.queue.push(member.id);
        }
      }
    });
  
    // 2. Resource Eviction
    if (state.queue.length > 0) {
      const evictableMembers = state.working
        .map(id => state.team.find(m => m.id === id)!)
        .filter(m => m && (state.day - m.resourceHeldSince) >= currentParams.minHoldTime)
        .sort((a, b) => (b.daysWithResource) - (a.daysWithResource));
      
      if (evictableMembers.length > 0) {
        const memberToEvict = evictableMembers[0];
        memberToEvict.status = MemberStatus.IDLE;
        memberToEvict.resourceHeldSince = -1;
        state.working = state.working.filter(id => id !== memberToEvict.id);
      }
    }
  
    // 3. Resource Allocation
    while (state.working.length < currentParams.resources && state.queue.length > 0) {
      const newWorkerId = state.queue.shift()!;
      const newWorker = state.team.find(m => m.id === newWorkerId)!;
      newWorker.status = MemberStatus.WORKING;
      newWorker.resourceHeldSince = state.day;
      state.working.push(newWorkerId);
    }
  
    // 4. Calculate Daily Output
    let dailyOutput = 0;
    state.working.forEach(id => {
      const worker = state.team.find(m => m.id === id)!;
      worker.daysWithResource = state.day - worker.resourceHeldSince;
      dailyOutput += worker.outputRate;
    });
    state.totalOutput += dailyOutput;
  }

  return {
    totalOutput: state.totalOutput,
    averageOutput: state.day > 0 ? state.totalOutput / state.day : 0,
    resourceUtilization: 0,
  }
};

const generateParetoMembers = (teamSize: number, avgOutput: number): Array<{ outputRate: number }> => {
    if (teamSize <= 0) return [];
    
    const totalOutput = teamSize * avgOutput;
    const top20Count = Math.max(1, Math.ceil(teamSize * 0.2));
    const bottom80Count = teamSize - top20Count;

    const topGroupOutput = totalOutput * 0.8;
    const bottomGroupOutput = totalOutput * 0.2;

    const generateRandomizedRates = (count: number, total: number): number[] => {
        if (count === 0) return [];
        if (count === 1) return [Math.round(total)];
        let shares = Array.from({ length: count }, () => Math.random() + 0.1);
        const sum = shares.reduce((a, b) => a + b, 0);
        let rates = shares.map(s => Math.round((s / sum) * total));
        
        let currentTotal = rates.reduce((a, b) => a + b, 0);
        let diff = Math.round(total) - currentTotal;
        
        for (let k = 0; k < Math.abs(diff); k++) {
            const idx = Math.floor(Math.random() * count);
            const adjustment = Math.sign(diff);
            if (rates[idx] + adjustment >= 1) {
                rates[idx] += adjustment;
            }
        }
        return rates.map(r => Math.max(1, r));
    };

    const topPerformersRates = generateRandomizedRates(top20Count, topGroupOutput);
    const otherPerformersRates = generateRandomizedRates(bottom80Count, bottomGroupOutput);

    let allRates = [...topPerformersRates, ...otherPerformersRates];

    for (let i = allRates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allRates[i], allRates[j]] = [allRates[j], allRates[i]];
    }

    return allRates.slice(0, teamSize).map(rate => ({ outputRate: Math.max(1, rate) }));
}

const findSaturationPoint = (curve: AnalysisDataPoint[], maxTeamSize: number): number => {
    if (curve.length < 3) return maxTeamSize;

    const yValues = curve.map(p => p.y);
    
    // 1. Smooth the curve using Exponential Moving Average (EMA)
    const beta = 0.9;
    const emaValues = [yValues[0]];
    for (let i = 1; i < yValues.length; i++) {
        emaValues[i] = beta * emaValues[i-1] + (1 - beta) * yValues[i];
    }

    // 2. Find the upper envelope of the smoothed curve to make it monotonically non-decreasing
    const upperEnvelope = [emaValues[0]];
    for (let i = 1; i < emaValues.length; i++) {
        upperEnvelope[i] = Math.max(upperEnvelope[i-1], emaValues[i]);
    }
    
    const processedCurve = curve.map((point, i) => ({ ...point, y: upperEnvelope[i] }));
    
    // 3. Calculate marginal gains on the processed curve
    const marginalGains = [];
    for (let i = 1; i < processedCurve.length; i++) {
        const gain = processedCurve[i].y - processedCurve[i-1].y;
        marginalGains.push({ teamSize: processedCurve[i].x, gain });
    }

    if (marginalGains.length === 0) return maxTeamSize;

    // Find the point of maximum gain
    let maxGain = -Infinity;
    let maxGainIndex = -1;
    marginalGains.forEach((g, index) => {
        if (g.gain > maxGain) {
            maxGain = g.gain;
            maxGainIndex = index;
        }
    });
    
    const yRange = Math.max(...yValues) - Math.min(...yValues);
    // If the curve is essentially flat, return the starting team size
    if (yRange === 0 || maxGain < yRange * 0.01) {
        return curve[0]?.x ?? 1;
    }
    
    // 4. Look for a sustained plateau after the point of maximum gain
    const windowSize = Math.max(3, Math.floor(marginalGains.length * 0.05));
    const saturationThreshold = maxGain * 0.15; // Plateau is when gain is <10% of peak gain

    for (let i = maxGainIndex; i <= marginalGains.length - windowSize; i++) {
        const windowSlice = marginalGains.slice(i, i + windowSize);
        const avgWindowGain = windowSlice.reduce((sum, current) => sum + current.gain, 0) / windowSize;

        if (avgWindowGain < saturationThreshold) {
            return marginalGains[i].teamSize;
        }
    }

    return maxTeamSize;
}


function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [avgOutputForGenerator, setAvgOutputForGenerator] = useState(10);
  const [usePareto, setUsePareto] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>(AnalysisType.PRODUCTIVITY_CURVE);
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [numRuns, setNumRuns] = useState(20);

  const handleRunAnalysis = useCallback(async (config: any) => {
    setIsAnalyzing(true);
    setAnalysisResults(null);
    setXDomain(null);
    
    // Allow UI to update to show "Analyzing..." state
    await new Promise(resolve => setTimeout(resolve, 50));

    if (config.type === AnalysisType.PRODUCTIVITY_CURVE) {
        const getXAxisLabel = () => {
            switch (config.param) {
                case 'teamSize': return 'Team Size (N)';
                case 'resources': return 'Resources (R)';
                case 'defaultIdeaProbability': return 'Idea Probability';
                default: return '';
            }
        }
        setXAxisLabel(getXAxisLabel());
        setYAxisLabel('Avg. Daily Output');
        
        const resultsData: AnalysisDataPoint[] = [];

        let membersForAnalysis: Array<{ outputRate: number; }> | null = null;
        if (config.param === 'resources' || config.param === 'defaultIdeaProbability') {
            const teamSize = params.teamSize;
            membersForAnalysis = usePareto
                ? generateParetoMembers(teamSize, avgOutputForGenerator)
                : Array.from({ length: teamSize }, () => ({ outputRate: avgOutputForGenerator }));
        }


        for (let i = config.from; i <= config.to + (config.step / 2); i += config.step) {
          const simParams = { ...params };
          if (config.param === 'teamSize') {
            const currentTeamSize = Math.round(i);
            simParams.teamSize = currentTeamSize;
            simParams.members = usePareto
              ? generateParetoMembers(currentTeamSize, avgOutputForGenerator)
              : Array.from({ length: currentTeamSize }, () => ({ outputRate: avgOutputForGenerator }));
          } else if (config.param === 'resources') {
            simParams.resources = Math.round(i);
            simParams.members = membersForAnalysis!;
          } else { // defaultIdeaProbability
            simParams.defaultIdeaProbability = parseFloat(i.toPrecision(12));
            simParams.members = membersForAnalysis!;
          }

          let totalAvgOutput = 0;
          for (let run = 0; run < config.numRuns; run++) {
              const result = runSingleSimulation(simParams);
              totalAvgOutput += result.averageOutput;
          }
          const finalAvgOutput = totalAvgOutput / config.numRuns;
          resultsData.push({ x: i, y: finalAvgOutput });
        }
        setAnalysisResults([{ label: 'Average Daily Output', data: resultsData }]);

    } else if (config.type === AnalysisType.SATURATION_ANALYSIS) {
        setXAxisLabel('Problem Difficulty (Avg. Days per Idea)');
        setYAxisLabel('Saturation Team Size');
        setXDomain([config.daysFrom, config.daysTo]);

        const saturationData: AnalysisDataPoint[] = [];
        
        for (let days = config.daysFrom; days <= config.daysTo; days += config.daysStep) {
            const currentProb = 1 / days;
            const productivityCurve: AnalysisDataPoint[] = [];

            for (let teamSize = 1; teamSize <= config.maxTeamSize; teamSize += config.teamSizeStep) {
                const simParams = { ...params, defaultIdeaProbability: currentProb, teamSize };
                simParams.members = usePareto
                    ? generateParetoMembers(teamSize, avgOutputForGenerator)
                    : Array.from({ length: teamSize }, () => ({ outputRate: avgOutputForGenerator }));

                let totalAvgOutput = 0;
                for (let run = 0; run < config.numRuns; run++) {
                    const result = runSingleSimulation(simParams);
                    totalAvgOutput += result.averageOutput;
                }
                const finalAvgOutput = totalAvgOutput / config.numRuns;
                productivityCurve.push({ x: teamSize, y: finalAvgOutput });
            }

            const saturationTeamSize = findSaturationPoint(productivityCurve, config.maxTeamSize);
            saturationData.push({ x: days, y: saturationTeamSize });
        }
        
        setAnalysisResults([{ label: 'Saturation Point', data: saturationData }]);
    }

    setIsAnalyzing(false);
  }, [params, avgOutputForGenerator, usePareto]);
  
  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    setAnalysisResults(null);
    setIsAnalyzing(false);
    setAvgOutputForGenerator(10);
    setUsePareto(true);
    setAnalysisType(AnalysisType.PRODUCTIVITY_CURVE);
    setXDomain(null);
    setNumRuns(20);
  };


  return (
    <div className="min-h-screen bg-slate-900 bg-grid-slate-700/[0.2] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                Team Productivity Simulator
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
                Analyze team output by simulating resource allocation dynamics.
            </p>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SimulationControls 
              params={params} 
              setParams={setParams}
              onRunAnalysis={handleRunAnalysis}
              onReset={handleReset}
              isAnalyzing={isAnalyzing}
              usePareto={usePareto}
              setUsePareto={setUsePareto}
              avgOutputForGenerator={avgOutputForGenerator}
              setAvgOutputForGenerator={setAvgOutputForGenerator}
              analysisType={analysisType}
              setAnalysisType={setAnalysisType}
              numRuns={numRuns}
              setNumRuns={setNumRuns}
          />
          <div className="flex flex-col">
            {isAnalyzing ? (
                 <div className="flex items-center justify-center h-full bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
                    <div className="flex flex-col items-center gap-4">
                        <svg className="animate-spin h-10 w-10 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-slate-300 font-medium">Running simulations, please wait...</p>
                    </div>
                </div>
            ) : analysisResults ? (
                <AnalysisChart results={analysisResults} xAxisLabel={xAxisLabel} yAxisLabel={yAxisLabel} xDomain={xDomain}/>
            ) : (
                <div className="flex items-center justify-center h-full bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
                    <p className="text-slate-400 text-center">Configure your analysis parameters and click "Run Analysis" to see the results chart.</p>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;