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

type AnalysisParameter = 'teamSize' | 'resources' | 'defaultIdeaProbability';
type ComparisonParameter = 'teamSize' | 'resources' | 'minHoldTime' | 'defaultIdeaProbability';


const NumericInput: React.FC<{
    value: number;
    onChange: (newValue: number) => void;
    [x: string]: any; // for other props
}> = ({ value, onChange, ...rest }) => {
    const [strValue, setStrValue] = React.useState(String(value));

    React.useEffect(() => {
        const numVal = parseFloat(strValue);
        if (isNaN(numVal) || numVal !== value) {
            setStrValue(String(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStrValue(val);
        const num = parseFloat(val);
        if (!isNaN(num) && isFinite(num)) {
            onChange(num);
        }
    };

    const handleBlur = () => {
        const num = parseFloat(strValue);
        if (isNaN(num) || !isFinite(num)) {
            setStrValue(String(value)); 
        }
    };

    const isValid = strValue.trim() !== '' && !isNaN(parseFloat(strValue)) && isFinite(parseFloat(strValue));

    return (
        <input
            type="number"
            value={strValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onWheel={e => (e.target as HTMLElement).blur()}
            className={`bg-slate-700 border rounded-md px-3 py-2 text-white focus:ring-2 focus:outline-none disabled:bg-slate-800 disabled:cursor-not-allowed ${isValid ? 'border-slate-600 focus:ring-cyan-500' : 'border-red-500 focus:ring-red-500'}`}
            {...rest}
        />
    );
};

const InputField: React.FC<{ id: string; label: string; value: number | string; onChange: (value: any) => void; type?: string; min?: number; max?: number; step?: number; children?: React.ReactNode; disabled?: boolean; }> = ({ id, label, value, onChange, type='number', min = 1, max = 100, step = 1, children, disabled=false }) => (
    <div className="flex flex-col space-y-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-400 flex items-center space-x-2">
            {children}
            <span>{label}</span>
        </label>
        {type === 'number' ? (
             <NumericInput
                id={id}
                value={value as number}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
            />
        ) : (
            <input
                type="text"
                id={id}
                value={value as string}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-slate-800 disabled:cursor-not-allowed"
             />
        )}
    </div>
);

const SimulationControls: React.FC<SimulationControlsProps> = ({ params, setParams, onRunAnalysis, onReset, isAnalyzing, usePareto, setUsePareto, avgOutputForGenerator, setAvgOutputForGenerator, analysisType, setAnalysisType, numRuns, setNumRuns }) => {
  // State for Productivity Curve
  const [pc_analysisParam, setPc_AnalysisParam] = useState<AnalysisParameter>('teamSize');
  const [pc_rangeFrom, setPc_RangeFrom] = useState(10);
  const [pc_rangeTo, setPc_RangeTo] = useState(100);
  const [pc_rangeStep, setPc_RangeStep] = useState(10);
  
  // State for Saturation Analysis
  const [sa_daysFrom, setSa_DaysFrom] = useState(2);
  const [sa_daysTo, setSa_DaysTo] = useState(20);
  const [sa_daysStep, setSa_DaysStep] = useState(2);
  const [sa_maxTeamSize, setSa_MaxTeamSize] = useState(50);
  const [sa_teamSizeStep, setSa_TeamSizeStep] = useState(1);
    
  // State for Comparative Analysis
  const [ca_analysisParam, setCa_AnalysisParam] = useState<AnalysisParameter>('teamSize');
  const [ca_rangeFrom, setCa_RangeFrom] = useState(10);
  const [ca_rangeTo, setCa_RangeTo] = useState(100);
  const [ca_rangeStep, setCa_RangeStep] = useState(10);
  const [ca_compareParam, setCa_CompareParam] = useState<ComparisonParameter>('minHoldTime');
  const [ca_compareValues, setCa_CompareValues] = useState('5, 10, 20');


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
      } else if (analysisType === AnalysisType.SATURATION_ANALYSIS){
          onRunAnalysis({ type: AnalysisType.SATURATION_ANALYSIS, daysFrom: sa_daysFrom, daysTo: sa_daysTo, daysStep: sa_daysStep, maxTeamSize: sa_maxTeamSize, teamSizeStep: sa_teamSizeStep, numRuns });
      } else if (analysisType === AnalysisType.COMPARATIVE_ANALYSIS) {
          onRunAnalysis({ type: AnalysisType.COMPARATIVE_ANALYSIS, analysisParam: ca_analysisParam, from: ca_rangeFrom, to: ca_rangeTo, step: ca_rangeStep, compareParam: ca_compareParam, compareValues: ca_compareValues, numRuns })
      }
  }

  const handleAnalysisParamChange = (
      newParam: AnalysisParameter,
      setFrom: (v: number) => void,
      setTo: (v: number) => void,
      setStep: (v: number) => void,
  ) => {
    if (newParam === 'defaultIdeaProbability') {
        setFrom(0.05);
        setTo(0.5);
        setStep(0.05);
    } else if (newParam === 'teamSize') {
        setFrom(10);
        setTo(100);
        setStep(10);
    } else { // resources
        setFrom(10);
        setTo(50);
        setStep(5);
    }
  }
  
  const isParamDisabled = (param: keyof SimulationParams) => {
      if (analysisType === AnalysisType.PRODUCTIVITY_CURVE && pc_analysisParam === param) return true;
      if (analysisType === AnalysisType.COMPARATIVE_ANALYSIS && (ca_analysisParam === param || ca_compareParam === param)) return true;
      if (analysisType === AnalysisType.SATURATION_ANALYSIS && param === 'defaultIdeaProbability') return true;
      return false;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Simulation Setup</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <InputField id="teamSize" label="Team Size (N)" value={params.teamSize} onChange={handleTeamSizeChange} min={1} max={500} disabled={isParamDisabled('teamSize')}>
            <UserIcon className="w-5 h-5" />
        </InputField>
        <InputField id="resources" label="Resources (R)" value={params.resources} onChange={(v) => handleParamChange('resources', v)} disabled={isParamDisabled('resources')}>
            <ResourceIcon className="w-5 h-5" />
        </InputField>
        <InputField id="minHoldTime" label="Min Hold Time (K)" value={params.minHoldTime} onChange={(v) => handleParamChange('minHoldTime', v)} disabled={isParamDisabled('minHoldTime')}>
            <ClockIcon className="w-5 h-5" />
        </InputField>
        <InputField id="duration" label="Duration (Days)" value={params.duration} onChange={(v) => handleParamChange('duration', v)} max={10000}>
            <ClockIcon className="w-5 h-5" />
        </InputField>
        <InputField id="defaultIdeaProbability" label="Default Idea Probability" value={params.defaultIdeaProbability} onChange={(v) => handleParamChange('defaultIdeaProbability', v)} min={0} max={1} step={0.01} disabled={isParamDisabled('defaultIdeaProbability')}>
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
                 <NumericInput
                    id="avgOutput"
                    value={avgOutputForGenerator}
                    onChange={setAvgOutputForGenerator}
                    min={1}
                    disabled={!usePareto || isAnalyzing}
                    className="w-full"
                 />
            </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Analysis Settings</h3>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <InputField id="numRuns" label="Runs per Data Point (for averaging)" value={numRuns} onChange={setNumRuns} min={1} max={50}>
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
                    <option value={AnalysisType.COMPARATIVE_ANALYSIS}>Comparative Analysis</option>
                    <option value={AnalysisType.SATURATION_ANALYSIS}>Saturation Point Analysis</option>
                </select>
            </div>
            {analysisType === AnalysisType.PRODUCTIVITY_CURVE && (
                <>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Analyze By</label>
                        <select 
                            value={pc_analysisParam}
                            onChange={(e) => {
                                const newParam = e.target.value as AnalysisParameter;
                                setPc_AnalysisParam(newParam);
                                handleAnalysisParamChange(newParam, setPc_RangeFrom, setPc_RangeTo, setPc_RangeStep);
                            }}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        >
                            <option value="teamSize">Team Size</option>
                            <option value="resources">Resources</option>
                            <option value="defaultIdeaProbability">Default Idea Probability</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <InputField id="rangeFrom" label="From" value={pc_rangeFrom} onChange={setPc_RangeFrom} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="rangeTo" label="To" value={pc_rangeTo} onChange={setPc_RangeTo} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="rangeStep" label="Step" value={pc_rangeStep} onChange={setPc_RangeStep} step={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} min={pc_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                    </div>
                </>
            )}
            {analysisType === AnalysisType.COMPARATIVE_ANALYSIS && (
                 <>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Analyze By (X-Axis)</label>
                         <select 
                            value={ca_analysisParam}
                            onChange={(e) => {
                                const newParam = e.target.value as AnalysisParameter;
                                setCa_AnalysisParam(newParam);
                                if (newParam === ca_compareParam) { // prevent collision
                                    const allCompareOptions: ComparisonParameter[] = ['teamSize', 'resources', 'minHoldTime', 'defaultIdeaProbability'];
                                    const nextAvailableOption = allCompareOptions.find(p => p !== newParam);
                                    if(nextAvailableOption) {
                                        setCa_CompareParam(nextAvailableOption);
                                    }
                                }
                                handleAnalysisParamChange(newParam, setCa_RangeFrom, setCa_RangeTo, setCa_RangeStep);
                            }}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        >
                            <option value="teamSize">Team Size</option>
                            <option value="resources">Resources</option>
                            <option value="defaultIdeaProbability">Default Idea Probability</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <InputField id="ca_rangeFrom" label="From" value={ca_rangeFrom} onChange={setCa_RangeFrom} step={ca_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="ca_rangeTo" label="To" value={ca_rangeTo} onChange={setCa_RangeTo} step={ca_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                        <InputField id="ca_rangeStep" label="Step" value={ca_rangeStep} onChange={setCa_RangeStep} step={ca_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} min={ca_analysisParam === 'defaultIdeaProbability' ? 0.01 : 1} />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Compare By</label>
                         <select 
                            value={ca_compareParam}
                            onChange={(e) => setCa_CompareParam(e.target.value as ComparisonParameter)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        >
                            {ca_analysisParam !== 'teamSize' && <option value="teamSize">Team Size</option>}
                            {ca_analysisParam !== 'resources' && <option value="resources">Resources</option>}
                            <option value="minHoldTime">Min Hold Time</option>
                            {ca_analysisParam !== 'defaultIdeaProbability' && <option value="defaultIdeaProbability">Default Idea Probability</option>}
                        </select>
                    </div>
                    <InputField id="ca_compareValues" label="Comparison Values (comma-separated)" type="text" value={ca_compareValues} onChange={setCa_CompareValues} />
                </>
            )}
            {analysisType === AnalysisType.SATURATION_ANALYSIS && (
                 <>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">Problem Difficulty (Days per Idea)</label>
                         <div className="grid grid-cols-3 gap-4">
                            <InputField id="sa_daysFrom" label="From (Easy)" value={sa_daysFrom} onChange={setSa_DaysFrom} step={1} max={1000} min={1} />
                            <InputField id="sa_daysTo" label="To (Hard)" value={sa_daysTo} onChange={setSa_DaysTo} step={1} max={1000} min={1} />
                            <InputField id="sa_daysStep" label="Step" value={sa_daysStep} onChange={setSa_DaysStep} step={1} min={1} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField id="sa_maxTeamSize" label="Max Team Size to Scan" value={sa_maxTeamSize} onChange={setSa_MaxTeamSize} min={5} max={200} />
                        <InputField id="sa_teamSizeStep" label="Team Size Scan Step" value={sa_teamSizeStep} onChange={setSa_TeamSizeStep} min={1} max={10} />
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