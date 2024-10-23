/******************************************
 * PART 1: Core Setup and Constants
 ******************************************/

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

// Chart color constants
const CHART_COLORS = {
  primary: '#3B82F6',    // Blue
  success: '#10B981',    // Green
  warning: '#F59E0B',    // Orange
  danger: '#EF4444',     // Red
  purple: '#8B5CF6',     // Purple
  pink: '#EC4899',       // Pink
};

// Region definitions
const REGIONS = [
  { value: 'KR', label: 'Korea' },
  { value: 'EN', label: 'English' },
  { value: 'CNTW', label: 'China/Taiwan' },
  { value: 'JP', label: 'Japan' },
];

/******************************************
 * PART 2: Component Structure and Helper Functions
 ******************************************/

const MarketingDashboard = () => {
  // State Management
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('KR');
  const [debugInfo, setDebugInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper Functions
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const cleanNumber = (value) => {
    if (!value || value === '-' || value === '₩-') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.toString().replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && date.includes('-')) return date;
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    } catch (e) {
      console.error('Date formatting error:', e);
      return date;
    }
  };

  // Excel File Processing
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setDebugInfo('No file selected');
      return;
    }

    setIsLoading(true);
    setDebugInfo(`File selected: ${file.name}`);

    try {
      const jsonData = await readExcelFile(file);
      processData(jsonData);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(`Error processing file: ${err.message}`);
      setDebugInfo(prev => `${prev}\nError: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target.result, {
            type: 'binary',
            cellDates: true,
            dateNF: 'yyyy-mm-dd'
          });
          
          const firstSheetName = workbook.SheetNames[0];
          setDebugInfo(prev => `${prev}\nSheet name: ${firstSheetName}`);
          
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  };

  const processData = (jsonData) => {
    setDebugInfo(prev => `${prev}\nTotal rows found: ${jsonData.length}`);

    // Process and validate data
    const processedData = jsonData.map(row => {
      const processedRow = {
        Date: formatDate(row.Date),
        'Game Issue': row['Game Issue'] || '',
        'Steam Issue': row['Steam Issue'] || '',
        'UA Issue': row['UA Issue'] || '',
        'Steam Total Traffic': cleanNumber(row['Steam Total Traffic']),
        'Steam Search': cleanNumber(row['Steam Search']),
        'Steam 3rd Party': cleanNumber(row['Steam 3rd Party']),
        'Steam Discount Page': cleanNumber(row['Steam Discount Page']),
        'Steam Bot': cleanNumber(row['Steam Bot']),
        'Steam Other page': cleanNumber(row['Steam Other page']),
        'Wishlist Addition': cleanNumber(row['Wishlist Addition']),
        'Wishlist Deletions': cleanNumber(row['Wishlist Deletions']),
        'Purchase&Activations': cleanNumber(row['Purchase&Activations']),
        'Gifts': cleanNumber(row['Gifts']),
        'Total Wishlist Balance': cleanNumber(row['Total Wishlist Balance'])
      };

      // Add region-specific metrics
      REGIONS.forEach(({ value: region }) => {
        processedRow[`GA ${region} Cost`] = cleanNumber(row[`GA ${region} Cost`]);
        processedRow[`GA ${region} Impression`] = cleanNumber(row[`GA ${region} Impression`]);
        processedRow[`GA ${region} Click`] = cleanNumber(row[`GA ${region} Click`]);
        processedRow[`X ${region} Cost`] = cleanNumber(row[`X ${region} Cost`]);
        processedRow[`X ${region} Impression`] = cleanNumber(row[`X ${region} Impression`]);
        processedRow[`X ${region} Click`] = cleanNumber(row[`X ${region} Click`]);
      });

      return processedRow;
    });

    // Sort data by date
    processedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    // Add debug information
    const firstRow = processedData[0];
    const lastRow = processedData[processedData.length - 1];
    setDebugInfo(prev => [
      prev,
      '\nData Processing Complete:',
      `Date Range: ${firstRow.Date} to ${lastRow.Date}`,
      '\nLatest Metrics:',
      `- Total Traffic: ${formatNumber(lastRow['Steam Total Traffic'])}`,
      `- Wishlist Balance: ${formatNumber(lastRow['Total Wishlist Balance'])}`,
      `- GA ${selectedRegion} Clicks: ${formatNumber(lastRow[`GA ${selectedRegion} Click`])}`,
      `- X ${selectedRegion} Clicks: ${formatNumber(lastRow[`X ${selectedRegion} Click`])}`,
    ].join('\n'));

    setData(processedData);
  };

  /******************************************
 * PART 3: Chart Components and Visualization
 ******************************************/

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-4 border rounded shadow-lg">
        <p className="font-bold text-gray-700 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p 
            key={index} 
            style={{ color: entry.color }} 
            className="text-sm mb-1"
          >
            {`${entry.name}: ${entry.dataKey.includes('Cost') 
              ? formatCurrency(entry.value) 
              : formatNumber(entry.value)}`}
          </p>
        ))}
      </div>
    );
  };

  // Chart utility functions
  const getYAxisDomain = (dataKeys, allowNegative = true) => {
  if (!data.length) return [0, 100];
  
  let values = data.flatMap(item => {
    if (Array.isArray(dataKeys)) {
      return dataKeys.map(key => cleanNumber(item[key]) || 0);
    }
    return [cleanNumber(item[dataKeys]) || 0];
  });

  const minValue = allowNegative ? Math.min(...values) : 0;
  const maxValue = Math.max(...values);
  
  return [minValue, maxValue * 1.2]; // Add 20% padding to top
};

  // Individual Chart Components
  const renderTrafficChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-600 mb-4">UA-Steam Traffic Comparison</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="Date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={getYAxisDomain(['Steam Total Traffic', `GA ${selectedRegion} Click`, `X ${selectedRegion} Click`])}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Steam Total Traffic" 
              stroke={CHART_COLORS.primary} 
              name="Total Traffic" 
              dot={false}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey={`GA ${selectedRegion} Click`} 
              stroke={CHART_COLORS.success} 
              name="GA Clicks" 
              dot={false}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey={`X ${selectedRegion} Click`} 
              stroke={CHART_COLORS.warning} 
              name="X Clicks" 
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSteamSourcesChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-600 mb-4">Steam Traffic Sources</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
            <YAxis domain={getYAxisDomain([
              'Steam Total Traffic', 'Steam Search', 'Steam 3rd Party',
              'Steam Discount Page', 'Steam Bot', 'Steam Other page'
            ])} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="Steam Total Traffic" stroke={CHART_COLORS.primary} name="Total Traffic" dot={false} />
            <Line type="monotone" dataKey="Steam Search" stroke={CHART_COLORS.success} name="Search" dot={false} />
            <Line type="monotone" dataKey="Steam 3rd Party" stroke={CHART_COLORS.warning} name="3rd Party" dot={false} />
            <Line type="monotone" dataKey="Steam Discount Page" stroke={CHART_COLORS.danger} name="Discount" dot={false} />
            <Line type="monotone" dataKey="Steam Bot" stroke={CHART_COLORS.purple} name="Bot" dot={false} />
            <Line type="monotone" dataKey="Steam Other page" stroke={CHART_COLORS.pink} name="Other" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWishlistChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-600 mb-4">Wishlist Activity</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
            <YAxis 
              allowDecimals={false}
              domain={[0, 'dataMax + 10']}
              tickCount={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="Wishlist Addition" stroke={CHART_COLORS.success} name="Additions" dot={false} />
            <Line type="monotone" dataKey="Wishlist Deletions" stroke={CHART_COLORS.danger} name="Deletions" dot={false} />
            <Line type="monotone" dataKey="Purchase&Activations" stroke={CHART_COLORS.primary} name="Purchases" dot={false} />
            <Line type="monotone" dataKey="Gifts" stroke={CHART_COLORS.warning} name="Gifts" dot={false} />
            <Line type="monotone" dataKey="Total Wishlist Balance" stroke={CHART_COLORS.purple} name="Balance" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderCombinedChart = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold text-gray-600 mb-4">UA-Steam-Wishlist Comparison</h3>
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" />
          <YAxis domain={getYAxisDomain([
            'Steam Total Traffic', `GA ${selectedRegion} Click`,
            `X ${selectedRegion} Click`, 'Total Wishlist Balance'
          ], false)} /> {/* Set allowNegative to false */}
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey={`GA ${selectedRegion} Click`} stroke={CHART_COLORS.primary} name="GA Clicks" dot={false} />
          <Line type="monotone" dataKey={`X ${selectedRegion} Click`} stroke={CHART_COLORS.success} name="X Clicks" dot={false} />
          <Line type="monotone" dataKey="Steam Total Traffic" stroke={CHART_COLORS.warning} name="Total Traffic" dot={false} />
          <Line type="monotone" dataKey="Total Wishlist Balance" stroke={CHART_COLORS.danger} name="Wishlist Balance" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

  /******************************************
 * PART 4: Main Render Method and Export
 ******************************************/

  // Main render method
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      {/* Debug Info Panel */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <pre className="whitespace-pre-wrap text-sm">{debugInfo}</pre>
      </div>

      {/* Header and Controls */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Game Marketing Analytics Dashboard</h1>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full md:w-auto px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm"
            />
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="block w-full md:w-auto px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm"
            >
              {REGIONS.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg">
          Loading data...
        </div>
      )}

      {/* Charts Section */}
      {data.length > 0 && (
        <div className="space-y-8">
          {renderTrafficChart()}
          {renderSteamSourcesChart()}
          {renderWishlistChart()}
          {renderCombinedChart()}
        </div>
      )}

      {/* No Data State */}
      {!data.length && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            Upload an Excel file to view the dashboard
          </p>
        </div>
      )}
    </div>
  );
};

// Final export
export default MarketingDashboard;

