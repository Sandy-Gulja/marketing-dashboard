import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const MarketingDashboard = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('KR');
  const [debugInfo, setDebugInfo] = useState('');

  // Clean number values
  const cleanNumber = (value) => {
    if (!value || value === '-' || value === '₩-') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setDebugInfo('No file selected');
      return;
    }

    setDebugInfo(`File selected: ${file.name}`);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Read workbook
        const workbook = XLSX.read(event.target.result, { 
          type: 'binary',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });

        // Set initial debug info
        setDebugInfo(prev => `${prev}\nSheet name: ${firstSheetName}`);
        setDebugInfo(prev => `${prev}\nTotal rows found: ${jsonData.length}`);

        // Process the data
        jsonData = jsonData.map(row => {
          const processedRow = {
            Date: row.Date,
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
            'Total Wishlist Balance': cleanNumber(row['Total Wishlist Balance']),
            [`GA ${selectedRegion} Click`]: cleanNumber(row[`GA ${selectedRegion} Click`]),
            [`X ${selectedRegion} Click`]: cleanNumber(row[`X ${selectedRegion} Click`])
          };
          return processedRow;
        });

        // Add date range info
        const startDate = jsonData[0].Date;
        const endDate = jsonData[jsonData.length - 1].Date;
        setDebugInfo(prev => `${prev}\nDate range: ${startDate} to ${endDate}`);

        // Add data statistics
        const lastRow = jsonData[jsonData.length - 1];
        setDebugInfo(prev => `${prev}\n\nLatest metrics (${endDate}):`);
        setDebugInfo(prev => `${prev}\n- Total Traffic: ${formatNumber(lastRow['Steam Total Traffic'])}`);
        setDebugInfo(prev => `${prev}\n- Total Wishlist Balance: ${formatNumber(lastRow['Total Wishlist Balance'])}`);
        setDebugInfo(prev => `${prev}\n- GA ${selectedRegion} Clicks: ${formatNumber(lastRow[`GA ${selectedRegion} Click`])}`);
        setDebugInfo(prev => `${prev}\n- X ${selectedRegion} Clicks: ${formatNumber(lastRow[`X ${selectedRegion} Click`])}`);

        setData(jsonData);
        setError('');
      } catch (err) {
        console.error('Error processing file:', err);
        setError(`Error reading Excel file: ${err.message}`);
        setDebugInfo(prev => `${prev}\nError: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ margin: 0 }}>{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '5px 0 0 0' }}>
              {`${entry.name}: ${formatNumber(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      {/* Debug Info Panel */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <pre className="whitespace-pre-wrap text-sm">{debugInfo}</pre>
      </div>

      {/* Header */}
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
              <option value="KR">Korea</option>
              <option value="EN">English</option>
              <option value="CNTW">China/Taiwan</option>
              <option value="JP">Japan</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {data.length > 0 && (
        <div className="space-y-8">
          {/* UA-Steam Traffic Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">UA-Steam Traffic Comparison</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="Steam Total Traffic" stroke="#3B82F6" name="Total Traffic" dot={false} />
                  <Line type="monotone" dataKey={`GA ${selectedRegion} Click`} stroke="#10B981" name="GA Clicks" dot={false} />
                  <Line type="monotone" dataKey={`X ${selectedRegion} Click`} stroke="#F59E0B" name="X Clicks" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Steam Traffic Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Steam Traffic Sources</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="Steam Total Traffic" stroke="#3B82F6" name="Total Traffic" dot={false} />
                  <Line type="monotone" dataKey="Steam Search" stroke="#10B981" name="Search" dot={false} />
                  <Line type="monotone" dataKey="Steam 3rd Party" stroke="#F59E0B" name="3rd Party" dot={false} />
                  <Line type="monotone" dataKey="Steam Discount Page" stroke="#EF4444" name="Discount" dot={false} />
                  <Line type="monotone" dataKey="Steam Bot" stroke="#8B5CF6" name="Bot" dot={false} />
                  <Line type="monotone" dataKey="Steam Other page" stroke="#EC4899" name="Other" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Steam Wishlist Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Steam Wishlist Activity</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="Wishlist Addition" stroke="#10B981" name="Additions" dot={false} />
                  <Line type="monotone" dataKey="Wishlist Deletions" stroke="#EF4444" name="Deletions" dot={false} />
                  <Line type="monotone" dataKey="Purchase&Activations" stroke="#3B82F6" name="Purchases" dot={false} />
                  <Line type="monotone" dataKey="Gifts" stroke="#F59E0B" name="Gifts" dot={false} />
                  <Line type="monotone" dataKey="Total Wishlist Balance" stroke="#8B5CF6" name="Balance" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* UA-Steam-Wishlist Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">UA-Steam-Wishlist Comparison</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey={`GA ${selectedRegion} Click`} stroke="#3B82F6" name="GA Clicks" dot={false} />
                  <Line type="monotone" dataKey={`X ${selectedRegion} Click`} stroke="#10B981" name="X Clicks" dot={false} />
                  <Line type="monotone" dataKey="Steam Total Traffic" stroke="#F59E0B" name="Total Traffic" dot={false} />
                  <Line type="monotone" dataKey="Total Wishlist Balance" stroke="#EF4444" name="Wishlist Balance" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingDashboard;