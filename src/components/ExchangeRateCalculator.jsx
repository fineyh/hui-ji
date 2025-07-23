import React, { useState, useMemo } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, ComposedChart } from 'recharts';
import { Plus, Trash2, Edit3, Save, X, Download, Upload, BarChart3, TrendingUp } from 'lucide-react';

const ExchangeRateCalculator = () => {
    const [exchangeData, setExchangeData] = useState([]);
    const [newRate, setNewRate] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editRate, setEditRate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [activeTab, setActiveTab] = useState('data');

    // 计算统计数据
    const statistics = useMemo(() => {
        if (exchangeData.length === 0) return null;

        let totalAmountAud = 0;
        let totalAmountCny = 0;
        let averageRates = [];

        // 计算累积平均汇率
        for (let i = 0; i < exchangeData.length; i++) {
            const currentData = exchangeData.slice(0, i + 1);
            let cumulativeAud = 0;
            let cumulativeCny = 0;

            currentData.forEach(({ rate, amount }) => {
                cumulativeAud += amount;
                cumulativeCny += rate * amount;
            });

            averageRates.push(cumulativeCny / cumulativeAud);
        }

        exchangeData.forEach(({ rate, amount }) => {
            totalAmountAud += amount;
            totalAmountCny += rate * amount;
        });

        const averageRate = totalAmountCny / totalAmountAud;
        const rates = exchangeData.map(d => d.rate);
        const latestRate = rates[rates.length - 1];
        const highestRate = Math.max(...rates);
        const lowestRate = Math.min(...rates);
        const previousRate = rates.length > 1 ? rates[rates.length - 2] : null;

        // 计算本次兑换对平均汇率的影响
        let averageRateChange = null;
        if (exchangeData.length > 1) {
            const previousAverageRate = averageRates[averageRates.length - 2];
            averageRateChange = averageRate - previousAverageRate;
        }

        // 计算差异（以2000澳元为基准）
        const baseAmount = 2000;
        const latestCost = latestRate * baseAmount;
        const previousCost = previousRate ? previousRate * baseAmount : null;
        const highestCost = highestRate * baseAmount;
        const lowestCost = lowestRate * baseAmount;

        return {
            averageRate,
            totalAmountAud,
            totalAmountCny,
            latestRate,
            highestRate,
            lowestRate,
            previousRate,
            exchangeCount: exchangeData.length,
            averageRates,
            averageRateChange,
            differences: {
                lastPrevious: previousCost ? latestCost - previousCost : null,
                lastMax: latestCost - highestCost,
                lastMin: latestCost - lowestCost
            }
        };
    }, [exchangeData]);

    // 准备图表数据
    const chartData = useMemo(() => {
        return exchangeData.map((item, index) => ({
            exchange: index + 1,
            rate: item.rate,
            amount: item.amount,
            averageRate: statistics?.averageRates[index] || 0,
            cnyForBase: item.rate * 2000
        }));
    }, [exchangeData, statistics]);

    // 计算图表Y轴范围
    const chartRanges = useMemo(() => {
        if (exchangeData.length === 0) return null;

        const rates = exchangeData.map(d => d.rate);
        const averageRates = statistics?.averageRates || [];
        const amounts = exchangeData.map(d => d.amount);
        const cnyValues = exchangeData.map(d => d.rate * 2000);

        // 汇率范围（包括平均汇率）
        const allRates = [...rates, ...averageRates];
        const minRate = Math.min(...allRates);
        const maxRate = Math.max(...allRates);
        const rateBuffer = (maxRate - minRate) * 0.1; // 10% 缓冲区

        // 金额范围
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        const amountBuffer = (maxAmount - minAmount) * 0.1;

        // 人民币支出范围
        const minCny = Math.min(...cnyValues);
        const maxCny = Math.max(...cnyValues);
        const cnyBuffer = (maxCny - minCny) * 0.1;

        return {
            rate: [
                Math.max(0, minRate - rateBuffer),
                maxRate + rateBuffer
            ],
            amount: [
                Math.max(0, minAmount - amountBuffer),
                maxAmount + amountBuffer
            ],
            cny: [
                Math.max(0, minCny - cnyBuffer),
                maxCny + cnyBuffer
            ]
        };
    }, [exchangeData, statistics]);

    const addExchange = () => {
        if (newRate && newAmount) {
            setExchangeData([...exchangeData, {
                rate: parseFloat(newRate),
                amount: parseFloat(newAmount)
            }]);
            setNewRate('');
            setNewAmount('');
        }
    };

    const deleteExchange = (index) => {
        setExchangeData(exchangeData.filter((_, i) => i !== index));
    };

    const startEdit = (index) => {
        setEditingIndex(index);
        setEditRate(exchangeData[index].rate.toString());
        setEditAmount(exchangeData[index].amount.toString());
    };

    const saveEdit = () => {
        if (editRate && editAmount) {
            const newData = [...exchangeData];
            newData[editingIndex] = {
                rate: parseFloat(editRate),
                amount: parseFloat(editAmount)
            };
            setExchangeData(newData);
            setEditingIndex(-1);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(-1);
        setEditRate('');
        setEditAmount('');
    };

    const exportData = () => {
        const dataStr = JSON.stringify(exchangeData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'huiji_exchange_data.json';
        link.click();
    };

    const downloadSampleData = () => {
        const sampleData = [
            { rate: 4.6604, amount: 2688.88 },
            { rate: 4.6445, amount: 2222.22 },
            { rate: 4.6428, amount: 2000 },
            { rate: 4.6360, amount: 2500 },
            { rate: 4.6474, amount: 2000 },
            { rate: 4.5660, amount: 2000 },
            { rate: 4.5713, amount: 2000 },
            { rate: 4.5701, amount: 6600 },
            { rate: 4.5666, amount: 4000 },
            { rate: 4.5635, amount: 6000 },
            { rate: 4.5542, amount: 6000 },
            { rate: 4.5227, amount: 4000 },
            { rate: 4.5897, amount: 2000 },
            { rate: 4.6564, amount: 2000 },
            { rate: 4.5485, amount: 4000 },
            { rate: 4.5495, amount: 2000 },
            { rate: 4.5473, amount: 2000 },
            { rate: 4.5434, amount: 2000 },
            { rate: 4.5434, amount: 2000 },
            { rate: 4.5434, amount: 8000 },
            { rate: 4.5391, amount: 4000 },
            { rate: 4.5412, amount: 4000 },
            { rate: 4.5419, amount: 1000 },
            { rate: 4.4481, amount: 2000 },
            { rate: 4.4481, amount: 4000 },
            { rate: 4.4633, amount: 2000 },
            { rate: 4.4633, amount: 4000 },
            { rate: 4.4607, amount: 2000 },
            { rate: 4.4269, amount: 2000 },
            { rate: 4.4269, amount: 6000 },
            { rate: 4.4269, amount: 2000 },
            { rate: 4.3886, amount: 2000 },
            { rate: 4.3994, amount: 4000 },
            { rate: 4.3943, amount: 4000 },
            { rate: 4.3854, amount: 2000 }
        ];

        const dataStr = JSON.stringify(sampleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'huiji_sample_exchange_data.json';
        link.click();
    };

    const loadSampleData = () => {
        const sampleData = [
            { rate: 4.6604, amount: 2688.88 },
            { rate: 4.6445, amount: 2222.22 },
            { rate: 4.6428, amount: 2000 },
            { rate: 4.6360, amount: 2500 },
            { rate: 4.6474, amount: 2000 },
            { rate: 4.5660, amount: 2000 },
            { rate: 4.5713, amount: 2000 },
            { rate: 4.5701, amount: 6600 },
            { rate: 4.5666, amount: 4000 },
            { rate: 4.5635, amount: 6000 },
            { rate: 4.5542, amount: 6000 },
            { rate: 4.5227, amount: 4000 },
            { rate: 4.5897, amount: 2000 },
            { rate: 4.6564, amount: 2000 },
            { rate: 4.5485, amount: 4000 },
            { rate: 4.5495, amount: 2000 },
            { rate: 4.5473, amount: 2000 },
            { rate: 4.5434, amount: 2000 },
            { rate: 4.5434, amount: 2000 },
            { rate: 4.5434, amount: 8000 },
            { rate: 4.5391, amount: 4000 },
            { rate: 4.5412, amount: 4000 },
            { rate: 4.5419, amount: 1000 },
            { rate: 4.4481, amount: 2000 },
            { rate: 4.4481, amount: 4000 },
            { rate: 4.4633, amount: 2000 },
            { rate: 4.4633, amount: 4000 },
            { rate: 4.4607, amount: 2000 },
            { rate: 4.4269, amount: 2000 },
            { rate: 4.4269, amount: 6000 },
            { rate: 4.4269, amount: 2000 },
            { rate: 4.3886, amount: 2000 },
            { rate: 4.3994, amount: 4000 },
            { rate: 4.3943, amount: 4000 },
            { rate: 4.3854, amount: 2000 }
        ];
        setExchangeData(sampleData);
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported)) {
                        // 验证数据格式
                        const isValidData = imported.every(item =>
                            typeof item === 'object' &&
                            typeof item.rate === 'number' &&
                            typeof item.amount === 'number' &&
                            item.rate > 0 &&
                            item.amount > 0
                        );

                        if (isValidData) {
                            setExchangeData(imported);
                            alert(`成功导入 ${imported.length} 条兑换记录`);
                        } else {
                            alert('数据格式错误：每条记录需要包含有效的 rate 和 amount 字段');
                        }
                    } else {
                        alert('文件格式错误：数据应该是一个数组');
                    }
                } catch {
                    alert('文件格式错误：无法解析JSON文件');
                }
            };
            reader.readAsText(file);
        }
        // 清空文件输入，允许重复选择同一文件
        event.target.value = '';
    };

    if (!statistics) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">汇记</h1>
                        <div className="mb-8">
                            <p className="text-lg text-gray-600 mb-4">欢迎使用汇记！</p>
                            <p className="text-gray-500 mb-6">
                                请导入您的汇率数据文件开始使用，或加载示例数据进行体验
                            </p>
                        </div>

                        <div className="space-y-4 max-w-md mx-auto">
                            <label className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                                <Upload size={20} />
                                导入数据文件
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={importData}
                                    className="hidden"
                                />
                            </label>

                            <button
                                onClick={loadSampleData}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <BarChart3 size={20} />
                                加载示例数据
                            </button>

                            <button
                                onClick={downloadSampleData}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                <Download size={20} />
                                下载数据格式模板
                            </button>
                        </div>

                        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
                            <h3 className="font-semibold text-gray-800 mb-2">数据文件格式说明：</h3>
                            <pre className="text-sm text-gray-600 bg-white p-3 rounded border">
{`[
  {
    "rate": 4.6604,
    "amount": 2688.88
  },
  {
    "rate": 4.6445,
    "amount": 2222.22
  }
]`}
              </pre>
                            <p className="text-xs text-gray-500 mt-2">
                                rate: 汇率（CNY/AUD），amount: 兑换金额（AUD）
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-7xl mx-auto">
                {/* 标题栏 */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-800">汇记</h1>
                        <div className="flex gap-4">
                            {exchangeData.length > 0 && (
                                <button
                                    onClick={exportData}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    <Download size={16} />
                                    导出数据
                                </button>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                                <Upload size={16} />
                                导入数据
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={importData}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={downloadSampleData}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                <Download size={16} />
                                下载模板
                            </button>
                        </div>
                    </div>
                </div>

                {/* 标签页导航 */}
                <div className="bg-white rounded-lg shadow-lg mb-6">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('data')}
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'data'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 className="inline mr-2" size={16} />
                            数据管理
                        </button>
                        <button
                            onClick={() => setActiveTab('statistics')}
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'statistics'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <TrendingUp className="inline mr-2" size={16} />
                            统计分析
                        </button>
                        <button
                            onClick={() => setActiveTab('charts')}
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'charts'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 className="inline mr-2" size={16} />
                            图表分析
                        </button>
                    </div>
                </div>

                {/* 数据管理标签页 */}
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 添加新数据 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">添加兑换记录</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        汇率
                                    </label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={newRate}
                                        onChange={(e) => setNewRate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="例如: 4.5000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        兑换金额 (AUD)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="例如: 2000.00"
                                    />
                                </div>
                                <button
                                    onClick={addExchange}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    <Plus size={16} />
                                    添加记录
                                </button>
                            </div>
                        </div>

                        {/* 数据列表 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">兑换记录</h2>
                            <div className="max-h-96 overflow-y-auto">
                                <div className="space-y-2">
                                    {exchangeData.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                        >
                                            {editingIndex === index ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={editRate}
                                                        onChange={(e) => setEditRate(e.target.value)}
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    />
                                                    <button
                                                        onClick={saveEdit}
                                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    >
                                                        <Save size={14} />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <span className="font-medium">{item.rate.toFixed(4)}</span>
                                                        <span className="text-gray-600 ml-2">
                              {item.amount.toFixed(2)} AUD
                            </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => startEdit(index)}
                                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteExchange(index)}
                                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 统计分析标签页 */}
                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        {/* 概要统计 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">平均汇率</h3>
                                <p className="text-3xl font-bold text-blue-600">
                                    {statistics.averageRate.toFixed(4)}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">兑换次数</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {statistics.exchangeCount}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">总兑换澳元</h3>
                                <p className="text-3xl font-bold text-purple-600">
                                    {statistics.totalAmountAud.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">总支出人民币</h3>
                                <p className="text-3xl font-bold text-red-600">
                                    {statistics.totalAmountCny.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* 详细分析 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">详细分析</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-700">汇率比较</h3>
                                    <div className="space-y-2">
                                        <p>
                                            <span className="font-medium">最新汇率:</span> {statistics.latestRate.toFixed(4)}
                                            {statistics.averageRateChange !== null && (
                                                <span className={`ml-2 text-sm ${statistics.averageRateChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          （本次兑换使得平均汇率{statistics.averageRateChange < 0 ? '下降' : '上升'}: {Math.abs(statistics.averageRateChange).toFixed(4)}）
                        </span>
                                            )}
                                        </p>
                                        <p>
                                            <span className="font-medium">最高汇率:</span> {statistics.highestRate.toFixed(4)}
                                        </p>
                                        <p>
                                            <span className="font-medium">最低汇率:</span> {statistics.lowestRate.toFixed(4)}
                                        </p>
                                        {statistics.previousRate && (
                                            <p>
                                                <span className="font-medium">前一次汇率:</span> {statistics.previousRate.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-700">成本差异 (以2000澳元为基准)</h3>
                                    <div className="space-y-2">
                                        {statistics.differences.lastPrevious !== null && (
                                            <p>
                                                比前一次{statistics.differences.lastPrevious < 0 ? '便宜' : '贵'}了:
                                                <span className={`font-bold ml-1 ${statistics.differences.lastPrevious < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(statistics.differences.lastPrevious).toFixed(2)} CNY
                        </span>
                                            </p>
                                        )}
                                        <p>
                                            比最高一次{statistics.differences.lastMax < 0 ? '便宜' : '贵'}了:
                                            <span className={`font-bold ml-1 ${statistics.differences.lastMax < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(statistics.differences.lastMax).toFixed(2)} CNY
                      </span>
                                        </p>
                                        <p>
                                            比最低一次{statistics.differences.lastMin < 0 ? '便宜' : '贵'}了:
                                            <span className={`font-bold ml-1 ${statistics.differences.lastMin < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(statistics.differences.lastMin).toFixed(2)} CNY
                      </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 总支出数据 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">总支出数据</h2>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-gray-700 mb-2">若算上第一次交押金18660澳元，即87946.45人民币（汇率4.7131）</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p>
                                        <span className="font-medium">总支出澳元:</span>
                                        <span className="font-bold text-blue-600 ml-2">
                      {(statistics.totalAmountAud + 18660).toFixed(2)} AUD
                    </span>
                                    </p>
                                    <p>
                                        <span className="font-medium">总支出人民币:</span>
                                        <span className="font-bold text-red-600 ml-2">
                      {(statistics.totalAmountCny + 87946.45).toFixed(2)} CNY
                    </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 图表分析标签页 */}
                {activeTab === 'charts' && (
                    <div className="space-y-6">
                        {/* 汇率趋势图 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">汇率趋势图</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="exchange" />
                                    <YAxis
                                        yAxisId="rate"
                                        orientation="left"
                                        domain={chartRanges ? chartRanges.rate : ['auto', 'auto']}
                                        tickFormatter={(value) => value.toFixed(3)}
                                    />
                                    <YAxis
                                        yAxisId="amount"
                                        orientation="right"
                                        domain={chartRanges ? chartRanges.amount : ['auto', 'auto']}
                                        tickFormatter={(value) => value.toLocaleString()}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === '兑换汇率' || name === '平均汇率') {
                                                return [value.toFixed(4), name];
                                            }
                                            return [value.toLocaleString(), name];
                                        }}
                                        labelFormatter={(label) => `第${label}次兑换`}
                                    />
                                    <Legend />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="兑换汇率"
                                    />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="averageRate"
                                        stroke="#16a34a"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ r: 3 }}
                                        name="平均汇率"
                                    />
                                    <Bar
                                        yAxisId="amount"
                                        dataKey="amount"
                                        fill="#dc2626"
                                        opacity={0.6}
                                        name="兑换金额 (AUD)"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>

                            {/* 添加汇率统计信息 */}
                            {chartRanges && statistics && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-blue-50 p-3 rounded">
                                        <p className="text-blue-700 font-medium">最新汇率</p>
                                        <p className="text-blue-900 font-bold">{statistics.latestRate.toFixed(4)}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded">
                                        <p className="text-red-700 font-medium">最高汇率</p>
                                        <p className="text-red-900 font-bold">{statistics.highestRate.toFixed(4)}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded">
                                        <p className="text-green-700 font-medium">最低汇率</p>
                                        <p className="text-green-900 font-bold">{statistics.lowestRate.toFixed(4)}</p>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded">
                                        <p className="text-purple-700 font-medium">平均汇率</p>
                                        <p className="text-purple-900 font-bold">{statistics.averageRate.toFixed(4)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 人民币支出图 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">人民币支出对比图 (以2000澳元为基准)</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="exchange" />
                                    <YAxis
                                        domain={chartRanges ? chartRanges.cny : ['auto', 'auto']}
                                        tickFormatter={(value) => `¥${value.toFixed(0)}`}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`¥${value.toFixed(2)}`, '支出人民币']}
                                        labelFormatter={(label) => `第${label}次兑换`}
                                    />
                                    <Bar
                                        dataKey="cnyForBase"
                                        fill="#f59e0b"
                                        stroke="#d97706"
                                        strokeWidth={1}
                                    />
                                </BarChart>
                            </ResponsiveContainer>

                            {/* 添加统计信息 */}
                            {chartData.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-orange-50 p-3 rounded">
                                        <p className="text-orange-700 font-medium">最高支出</p>
                                        <p className="text-orange-900 font-bold">¥{Math.max(...chartData.map(d => d.cnyForBase)).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded">
                                        <p className="text-green-700 font-medium">最低支出</p>
                                        <p className="text-green-900 font-bold">¥{Math.min(...chartData.map(d => d.cnyForBase)).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded">
                                        <p className="text-blue-700 font-medium">支出差额</p>
                                        <p className="text-blue-900 font-bold">¥{(Math.max(...chartData.map(d => d.cnyForBase)) - Math.min(...chartData.map(d => d.cnyForBase))).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded">
                                        <p className="text-purple-700 font-medium">最新支出</p>
                                        <p className="text-purple-900 font-bold">¥{chartData[chartData.length - 1]?.cnyForBase.toFixed(2)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExchangeRateCalculator;