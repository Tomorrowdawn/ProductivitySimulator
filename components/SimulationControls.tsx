import React, { useState } from 'react';
import type { SimulationParams } from '../types';
import { AnalysisType } from '../types';
import { UserIcon, ResourceIcon, ClockIcon, ResetIcon, LightbulbIcon, ChartBarIcon, RepeatIcon } from './Icons';

interface SimulationControlsProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  onRunAnalysis: (config: any) => void;
  onReset: () => void;
  isAnalyzing: boolean;
  usePareto: boolean;
  setUsePareto: React.Dispatch<React.SetStateAction<boolean>>;
  avgOutputForGenerator: number;
  setAvgOutputForGenerator: React.Dispatch<React.SetStateAction<number>>;
  analysisType: AnalysisType;
  setAnalysisType: React.Dispatch<React.SetStateAction<AnalysisType>>;
  numRuns: number;
  setNumRuns: React.Dispatch<React.SetStateAction<number>>;
}

const InputField: React.FC<{ id: string; label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min?: number; max?: number; step?: number; children?: React.ReactNode; disabled?: boolean; }> = ({ id, label, value, onChange, min = 1, max = 100, step = 1, children, disabled=false }) => (
    <div className="flex flex-col space-y-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-400 flex items-center space-x-2">
            {children}
            <span>{label}</span>
        </label>
        <input
            type="number"
            id={id}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-slate-800 disabled:cursor-not-allowed"
        />
    </div>
);

const SimulationControls: React.FC<SimulationControlsProps> = ({ params, setParams, onRunAnalysis, onReset, isAnalyzing, usePareto, setUsePareto, avgOutputForGenerator, setAvgOutputForGenerator, analysisType, setAnalysisType, numRuns, setNumRuns }) => {
  // State for Productivity Curve
  const [pc_analysisParam, setPc_AnalysisParam] = useState<'teamSize' | 'resources' | 'defaultIdeaProbability'>('teamSize');
  const [pc_rangeFrom, setPc_RangeFrom] = useState(5);
  const [pc_rangeTo, setPc_RangeTo] = useState(20);
  const [pc_rangeStep, setPc_RangeStep] = useState(1);
  
  // State for Saturation Analysis
  const [sa_daysFrom, setSa_DaysFrom] = useState(2);
  const [sa_daysTo, setSa_DaysTo] = useState(20);
  const [sa_daysStep, setSa_DaysStep] = useState(2);
  const [sa_maxTeamSize, setSa_MaxTeamSize] = useState(50);
  const [sa_teamSizeStep, setSa_TeamSizeStep] = useState(1);


  const handleParamChange = <K extends keyof SimulationParams,>(key: K, value: SimulationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };
  
  const handleTeamSizeChange = (newSize: number) => {
    const currentSize = params.members.length;
    if (newSize > currentSize) {
      const newMembers = Array.from({ length: newSize - currentSize }, () => ({ outputRate: avgOutputForGenerator }));
      setParams(prev => ({
        ...prev,
        teamSize: newSize,
        members: [...prev.members, ...newMembers],
      }));
    } else {
      setParams(prev => ({
        ...prev,
        teamSize: newSize,
        members: prev.members.slice(0, newSize),
      }));
    }
  };
  
  const handleRunClick = () => {
      if (analysisType === AnalysisType.PRODUCTIVITY_CURVE) {
          onRunAnalysis({ type: AnalysisType.PRODUCTIVITY_CURVE, param: pc_analysisParam, from: pc_rangeFrom, to: pc_rangeTo, step: pc_rangeStep, numRuns });
      } else {
          onRunAnalysis({ type: AnalysisType.SATURATION_ANALYSIS, daysFrom: sa_daysFrom, daysTo: sa_daysTo, daysStep: sa_daysStep, maxTeamSize: sa_maxTeamSize, teamSizeStep: sa_teamSizeStep, numRuns });
      }
  }

  const handlePcAnalysisParamChange = (newParam: 'teamSize' | 'resources' | 'defaultIdeaProbability') => {
    setPc_AnalysisParam(newParam);
    if (newParam === 'defaultIdeaProbability') {
        setPc_RangeFrom(0.05);
        setPc_RangeTo(0.5);
        setPc_RangeStep(0.05);
    } else if (newParam === 'teamSize') {
        setPc_RangeFrom(5);
        setPc_RangeTo(20);
        setPc_RangeStep(1);
    } else { // resources
        setPc_RangeFrom(1);
        setPc_RangeTo(10);
        setPc_RangeStep(1);
    }
  }


  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Simulation Setup</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <InputField id="teamSize" label="Team Size (N)" value={params.teamSize} onChange={(e) => handleTeamSizeChange(Number(e.target.value))} min={1} max={100} disabled={pc_analysisParam === 'teamSize' && analysisType === AnalysisType.PRODUCTIVITY_CURVE}>
            <UserIcon className="w-5 h-5" />
        </InputField>
        <InputField id="resources" label="Resources (R)" value={params.resources} onChange={(e) => handleParamChange('resources', Number(e.target.value))} disabled={pc_analysisParam === 'resources' && analysisType === AnalysisType.PRODUCTIVITY_CURVE}>
            <ResourceIcon className="w-5 h-5" />
        </InputField>
        <InputField id="minHoldTime" label="Min Hold Time (K)" value={params.minHoldTime} onChange={(e) => handleParamChange('minHoldTime', Number(e.target.value))}>
            <ClockIcon className="w-5 h-5" />
        </InputField>
        <InputField id="duration" label="Duration (Days)" value={params.duration} onChange={(e) => handleParamChange('duration', Number(e.target.value))} max={10000}>
            <ClockIcon className="w-5 h-5" />
        </InputField>
        <InputField id="defaultIdeaProbability" label="Default Idea Probability" value={params.defaultIdeaProbability} onChange={(e) => handleParamChange('defaultIdeaProbability', Number(e.target.value))} min={0} max={1} step={0.01} disabled={(pc_analysisParam === 'defaultIdeaProbability' && analysisType === AnalysisType.PRODUCTIVITY_CURVE) || analysisType === AnalysisType.SATURATION_ANALYSIS}>
            <LightbulbIcon className="w-5 h-5" />
        </InputField>
      </div>

       <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Output Rate Distribution</h3>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    id="usePareto"
                    checked={usePareto}
                    onChange={(e) => setUsePareto(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-600 focus:ring-offset-slate-800"
                />
                <label htmlFor="usePareto" className="font-medium text-white select-none">Use 80/20 (Pareto) Distribution</label>
            </div>
            <div className="flex-grow">
                 <label htmlFor="avgOutput" className={`text-sm font-medium block mb-2 transition-colors ${usePareto ? 'text-slate-400' : 'text-slate-200'}`}>
                    Average Output Rate (used for distribution)
                </label>
                 <input
                    type="number"
                    id="avgOutput"
                    value={avgOutputForGenerator}
                    onChange={(e) => setAvgOutputForGenerator(Number(e.target.value))}
                    min={1}
                    disabled={!usePareto || isAnalyzing}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-slate-800 disabled:cursor-not-allowed"
                 />
            </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Analysis Settings</h3>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <InputField id="numRuns" label="Runs per Data Point (for averaging)" value={numRuns} onChange={(e) => setNumRuns(Number(e.target.value))} min={1} max={50}>
                <RepeatIcon className="w-5 h-5" />
            </InputField>
            <div>
                <label className="text-sm font-medium text-slate-400 block mb-2">Analysis Type</label>
                <select 
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                    <option value={AnalysisType.PRODUCTIVITY_CURVE}>Productivity Curve</option>
                    <option value={AnalysisType.SATURATION_ANALYSIS}>Saturation Point Analysis</option>
                </select>
            </div>
            {analysisType === AnalysisType.PRODUCTIVITY_CURVE && (
                <>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Analyze By</label>
                        <select 
                            value={pc_analysisParam}
                            onChange={(e) => handlePcAnalysisParamChange(e.target.value as 'teamSize' | 'resources' | 'defaultIdeaProbability')}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        >
                            <option value="teamSize">Team Size</option>
                            <option value="resources">Resources</option>
                            <option value="defaultIdeaProbability">Default Idea Probability</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <InputField id="rangeFrom" label="From" value={pc_rangeFrom} onChange={e => setPc_RangeFrom(Number(e.target.value))} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="rangeTo" label="To" value={pc_rangeTo} onChange={e => setPc_RangeTo(Number(e.target.value))} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="rangeStep" label="Step" value={pc_rangeStep} onChange={e => setPc_RangeStep(Number(e.target.value))} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} min={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                    </div>
                </>
            )}
            {analysisType === AnalysisType.SATURATION_ANALYSIS && (
                 <>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Problem Difficulty (Days per Idea)</label>
                         <div className="grid grid-cols-3 gap-4">
                            <InputField id="sa_daysFrom" label="From (Easy)" value={sa_daysFrom} onChange={e => setSa_DaysFrom(Number(e.target.value))} step={1} max={1000} min={1} />
                            <InputField id="sa_daysTo" label="To (Hard)" value={sa_daysTo} onChange={e => setSa_DaysTo(Number(e.target.value))} step={1} max={1000} min={1} />
                            <InputField id="sa_daysStep" label="Step" value={sa_daysStep} onChange={e => setSa_DaysStep(Number(e.target.value))} step={1} min={1} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField id="sa_maxTeamSize" label="Max Team Size to Scan" value={sa_maxTeamSize} onChange={e => setSa_MaxTeamSize(Number(e.target.value))} min={5} max={200} />
                        <InputField id="sa_teamSizeStep" label="Team Size Scan Step" value={sa_teamSizeStep} onChange={e => setSa_TeamSizeStep(Number(e.target.value))} min={1} max={10} />
                    </div>
                </>
            )}

        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button onClick={handleRunClick} disabled={isAnalyzing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-cyan-600 rounded-lg shadow-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all transform hover:scale-105">
            <ChartBarIcon className="w-5 h-5" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        <button onClick={onReset} disabled={isAnalyzing} className="flex items-center justify-center gap-2 px-5 py-3 font-semibold text-slate-300 bg-slate-700 rounded-lg shadow-md hover:bg-slate-600 disabled:bg-slate-600/50 disabled:cursor-not-allowed transition-all">
          <ResetIcon className="w-5 h-5" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;