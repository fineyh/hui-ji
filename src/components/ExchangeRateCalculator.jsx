import React, { useState, useMemo } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, ComposedChart } from 'recharts';
import { Plus, Trash2, Edit3, Save, X, Download, Upload, BarChart3, TrendingUp } from 'lucide-react';

const ExchangeRateCalculator = () => {
    const [exchangeData, setExchangeData] = useState([]);
    const [newRate, setNewRate] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDirection, setNewDirection] = useState('cny_to_aud');
    const [newNote, setNewNote] = useState('');
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editRate, setEditRate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDirection, setEditDirection] = useState('cny_to_aud');
    const [editNote, setEditNote] = useState('');
    const [activeTab, setActiveTab] = useState('data');

    // 计算统计数据
    const statistics = useMemo(() => {
        if (exchangeData.length === 0) return null;

        let totalAmountAudIn = 0;  // 买入的澳元
        let totalAmountAudOut = 0; // 卖出的澳元
        let totalAmountCnyOut = 0; // 支出的人民币
        let totalAmountCnyIn = 0;  // 收入的人民币
        let averageRates = [];

        // 计算累积平均汇率（基于人民币净支出和澳元净持有）
        for (let i = 0; i < exchangeData.length; i++) {
            const currentData = exchangeData.slice(0, i + 1);
            let cumulativeAudNet = 0;
            let cumulativeCnyNet = 0;

            currentData.forEach(({ rate, amount, direction = 'cny_to_aud' }) => {
                if (direction === 'cny_to_aud') {
                    // 买入澳元：支出人民币，获得澳元
                    cumulativeAudNet += amount;
                    cumulativeCnyNet += rate * amount;
                } else {
                    // 卖出澳元：支出澳元，获得人民币
                    cumulativeAudNet -= amount;
                    cumulativeCnyNet -= rate * amount;
                }
            });

            // 如果澳元净持有量为正，计算平均成本
            if (cumulativeAudNet > 0) {
                averageRates.push(cumulativeCnyNet / cumulativeAudNet);
            } else {
                // 如果澳元净持有量为0或负数，使用上一次的平均汇率
                averageRates.push(averageRates.length > 0 ? averageRates[averageRates.length - 1] : 0);
            }
        }

        exchangeData.forEach(({ rate, amount, direction = 'cny_to_aud' }) => {
            if (direction === 'cny_to_aud') {
                totalAmountAudIn += amount;
                totalAmountCnyOut += rate * amount;
            } else {
                totalAmountAudOut += amount;
                totalAmountCnyIn += rate * amount;
            }
        });

        const netAmountAud = totalAmountAudIn - totalAmountAudOut;
        const netAmountCny = totalAmountCnyOut - totalAmountCnyIn;
        const averageRate = netAmountAud > 0 ? netAmountCny / netAmountAud : 0;

        // 只考虑买入澳元的汇率数据
        const buyTransactions = exchangeData.filter(item => (item.direction || 'cny_to_aud') === 'cny_to_aud');
        const buyRates = buyTransactions.map(d => d.rate);

        const latestBuyRate = buyRates.length > 0 ? buyRates[buyRates.length - 1] : 0;
        const highestBuyRate = buyRates.length > 0 ? Math.max(...buyRates) : 0;
        const lowestBuyRate = buyRates.length > 0 ? Math.min(...buyRates) : 0;
        const previousBuyRate = buyRates.length > 1 ? buyRates[buyRates.length - 2] : null;

        // 计算本次兑换对平均汇率的影响
        let averageRateChange = null;
        if (exchangeData.length > 1) {
            const previousAverageRate = averageRates[averageRates.length - 2];
            averageRateChange = averageRates[averageRates.length - 1] - previousAverageRate;
        }

        // 计算差异（以2000澳元为基准，只基于买入汇率）
        const baseAmount = 2000;
        const latestBuyCost = latestBuyRate * baseAmount;
        const previousBuyCost = previousBuyRate ? previousBuyRate * baseAmount : null;
        const highestBuyCost = highestBuyRate * baseAmount;
        const lowestBuyCost = lowestBuyRate * baseAmount;

        return {
            averageRate,
            totalAmountAudIn,
            totalAmountAudOut,
            netAmountAud,
            totalAmountCnyOut,
            totalAmountCnyIn,
            netAmountCny,
            latestBuyRate,
            highestBuyRate,
            lowestBuyRate,
            previousBuyRate,
            exchangeCount: exchangeData.length,
            buyCount: buyTransactions.length,
            averageRates,
            averageRateChange,
            differences: {
                lastPrevious: previousBuyCost ? latestBuyCost - previousBuyCost : null,
                lastMax: latestBuyCost - highestBuyCost,
                lastMin: latestBuyCost - lowestBuyCost
            }
        };
    }, [exchangeData]);

    // 分离买入和卖出数据
    const separatedData = useMemo(() => {
        const buyData = [];
        const sellData = [];
        let buyIndex = 1;
        let sellIndex = 1;

        exchangeData.forEach((item, index) => {
            const baseData = {
                rate: item.rate,
                amount: item.amount,
                averageRate: statistics?.averageRates[index] || 0,
                cnyForBase: item.rate * 2000,
                note: item.note || '',
                originalIndex: index + 1
            };

            if ((item.direction || 'cny_to_aud') === 'cny_to_aud') {
                buyData.push({
                    ...baseData,
                    exchange: buyIndex++
                });
            } else {
                sellData.push({
                    ...baseData,
                    exchange: sellIndex++
                });
            }
        });

        return { buyData, sellData };
    }, [exchangeData, statistics]);

    // 准备分离的汇率数据用于综合图表
    const separatedRateData = useMemo(() => {
        const result = [];

        exchangeData.forEach((item, index) => {
            const isBuy = (item.direction || 'cny_to_aud') === 'cny_to_aud';

            result.push({
                exchange: index + 1,
                buyRate: isBuy ? item.rate : null,
                sellRate: !isBuy ? item.rate : null,
                amount: isBuy ? item.amount : -item.amount,
                averageRate: statistics?.averageRates[index] || 0,
                direction: item.direction || 'cny_to_aud',
                note: item.note || ''
            });
        });

        return result;
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

        // 分别计算买入和卖出的范围
        const buyRates = separatedData.buyData.map(d => d.rate);
        const sellRates = separatedData.sellData.map(d => d.rate);
        const buyAmounts = separatedData.buyData.map(d => d.amount);
        const sellAmounts = separatedData.sellData.map(d => d.amount);
        const buyCnyValues = separatedData.buyData.map(d => d.cnyForBase);
        const sellCnyValues = separatedData.sellData.map(d => d.cnyForBase);

        const getBuyRanges = () => {
            if (buyRates.length === 0) return { rate: [0, 1], amount: [0, 1], cny: [0, 1] };
            const minBuyRate = Math.min(...buyRates);
            const maxBuyRate = Math.max(...buyRates);
            const buyRateBuffer = (maxBuyRate - minBuyRate) * 0.1;
            const minBuyAmount = Math.min(...buyAmounts);
            const maxBuyAmount = Math.max(...buyAmounts);
            const buyAmountBuffer = (maxBuyAmount - minBuyAmount) * 0.1;
            const minBuyCny = Math.min(...buyCnyValues);
            const maxBuyCny = Math.max(...buyCnyValues);
            const buyCnyBuffer = (maxBuyCny - minBuyCny) * 0.1;

            return {
                rate: [Math.max(0, minBuyRate - buyRateBuffer), maxBuyRate + buyRateBuffer],
                amount: [Math.max(0, minBuyAmount - buyAmountBuffer), maxBuyAmount + buyAmountBuffer],
                cny: [Math.max(0, minBuyCny - buyCnyBuffer), maxBuyCny + buyCnyBuffer]
            };
        };

        const getSellRanges = () => {
            if (sellRates.length === 0) return { rate: [0, 1], amount: [0, 1], cny: [0, 1] };
            const minSellRate = Math.min(...sellRates);
            const maxSellRate = Math.max(...sellRates);
            const sellRateBuffer = (maxSellRate - minSellRate) * 0.1;
            const minSellAmount = Math.min(...sellAmounts);
            const maxSellAmount = Math.max(...sellAmounts);
            const sellAmountBuffer = (maxSellAmount - minSellAmount) * 0.1;
            const minSellCny = Math.min(...sellCnyValues);
            const maxSellCny = Math.max(...sellCnyValues);
            const sellCnyBuffer = (maxSellCny - minSellCny) * 0.1;

            return {
                rate: [Math.max(0, minSellRate - sellRateBuffer), maxSellRate + sellRateBuffer],
                amount: [Math.max(0, minSellAmount - sellAmountBuffer), maxSellAmount + sellAmountBuffer],
                cny: [Math.max(0, minSellCny - sellCnyBuffer), maxSellCny + sellCnyBuffer]
            };
        };

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
            ],
            buy: getBuyRanges(),
            sell: getSellRanges()
        };
    }, [exchangeData, statistics, separatedData]);

    const addExchange = () => {
        if (newRate && newAmount) {
            const newRecord = {
                rate: parseFloat(newRate),
                amount: parseFloat(newAmount),
                direction: newDirection,
                note: newNote.trim()
            };
            setExchangeData([...exchangeData, newRecord]);
            setNewRate('');
            setNewAmount('');
            setNewDirection('cny_to_aud');
            setNewNote('');
        }
    };

    const deleteExchange = (index) => {
        setExchangeData(exchangeData.filter((_, i) => i !== index));
    };

    const startEdit = (index) => {
        const item = exchangeData[index];
        setEditingIndex(index);
        setEditRate(item.rate.toString());
        setEditAmount(item.amount.toString());
        setEditDirection(item.direction || 'cny_to_aud');
        setEditNote(item.note || '');
    };

    const saveEdit = () => {
        if (editRate && editAmount) {
            const newData = [...exchangeData];
            newData[editingIndex] = {
                rate: parseFloat(editRate),
                amount: parseFloat(editAmount),
                direction: editDirection,
                note: editNote.trim()
            };
            setExchangeData(newData);
            setEditingIndex(-1);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(-1);
        setEditRate('');
        setEditAmount('');
        setEditDirection('cny_to_aud');
        setEditNote('');
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
            { rate: 4.7131, amount: 18660, direction: 'cny_to_aud', note: '交押金' },
            { rate: 4.6604, amount: 2688.88, direction: 'cny_to_aud', note: '初次兑换' },
            { rate: 4.6445, amount: 2222.22, direction: 'cny_to_aud', note: '学费' },
            { rate: 4.6428, amount: 2000, direction: 'cny_to_aud', note: '生活费' },
            { rate: 4.6360, amount: 2500, direction: 'cny_to_aud', note: '' },
            { rate: 4.6474, amount: 2000, direction: 'cny_to_aud', note: '房租' },
            { rate: 4.5660, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5713, amount: 2000, direction: 'cny_to_aud', note: '生活费' },
            { rate: 4.5701, amount: 6600, direction: 'cny_to_aud', note: '大额兑换' },
            { rate: 4.5666, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5635, amount: 6000, direction: 'cny_to_aud', note: '学费支付' },
            { rate: 4.5542, amount: 6000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5227, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5897, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.6564, amount: 2000, direction: 'cny_to_aud', note: '汇率回升' },
            { rate: 4.5485, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5495, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5473, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 8000, direction: 'cny_to_aud', note: '大额生活费' },
            { rate: 4.5391, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5412, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5419, amount: 1000, direction: 'cny_to_aud', note: '小额兑换' },
            { rate: 4.4481, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4481, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4633, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4633, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4607, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 6000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3886, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3994, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3943, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3854, amount: 2000, direction: 'cny_to_aud', note: '' },
            // 添加一些反向兑换的示例
            { rate: 4.7200, amount: 5000, direction: 'aud_to_cny', note: '朋友借钱' },
            { rate: 4.8500, amount: 3000, direction: 'aud_to_cny', note: '汇率套利' }
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
            { rate: 4.7131, amount: 18660, direction: 'cny_to_aud', note: '交押金' },
            { rate: 4.6604, amount: 2688.88, direction: 'cny_to_aud', note: '初次兑换' },
            { rate: 4.6445, amount: 2222.22, direction: 'cny_to_aud', note: '学费' },
            { rate: 4.6428, amount: 2000, direction: 'cny_to_aud', note: '生活费' },
            { rate: 4.6360, amount: 2500, direction: 'cny_to_aud', note: '' },
            { rate: 4.6474, amount: 2000, direction: 'cny_to_aud', note: '房租' },
            { rate: 4.5660, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5713, amount: 2000, direction: 'cny_to_aud', note: '生活费' },
            { rate: 4.5701, amount: 6600, direction: 'cny_to_aud', note: '大额兑换' },
            { rate: 4.5666, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5635, amount: 6000, direction: 'cny_to_aud', note: '学费支付' },
            { rate: 4.5542, amount: 6000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5227, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5897, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.6564, amount: 2000, direction: 'cny_to_aud', note: '汇率回升' },
            { rate: 4.5485, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5495, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5473, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5434, amount: 8000, direction: 'cny_to_aud', note: '大额生活费' },
            { rate: 4.5391, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5412, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.5419, amount: 1000, direction: 'cny_to_aud', note: '小额兑换' },
            { rate: 4.4481, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4481, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4633, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4633, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4607, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 6000, direction: 'cny_to_aud', note: '' },
            { rate: 4.4269, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3886, amount: 2000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3994, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3943, amount: 4000, direction: 'cny_to_aud', note: '' },
            { rate: 4.3854, amount: 2000, direction: 'cny_to_aud', note: '' },
            // 添加一些反向兑换的示例
            { rate: 4.7200, amount: 5000, direction: 'aud_to_cny', note: '朋友借钱' },
            { rate: 4.8500, amount: 3000, direction: 'aud_to_cny', note: '汇率套利' }
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
                        // 验证数据格式并添加默认值
                        const isValidData = imported.every(item =>
                            typeof item === 'object' &&
                            typeof item.rate === 'number' &&
                            typeof item.amount === 'number' &&
                            item.rate > 0 &&
                            item.amount > 0
                        );

                        if (isValidData) {
                            // 为旧数据添加默认值
                            const processedData = imported.map(item => ({
                                rate: item.rate,
                                amount: item.amount,
                                direction: item.direction || 'cny_to_aud', // 默认为买入澳元
                                note: item.note || ''  // 默认为空备注
                            }));

                            setExchangeData(processedData);
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
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">汇记 (hui-ji)</h1>
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
    "amount": 2688.88,
    "direction": "cny_to_aud",
    "note": "学费"
  },
  {
    "rate": 4.7200,
    "amount": 5000,
    "direction": "aud_to_cny",
    "note": "朋友借钱"
  }
]`}
              </pre>
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <p><strong>rate:</strong> 汇率（CNY/AUD）</p>
                                <p><strong>amount:</strong> 兑换金额</p>
                                <p><strong>direction:</strong> cny_to_aud（买入澳元）/ aud_to_cny（卖出澳元）</p>
                                <p><strong>note:</strong> 备注（可选）</p>
                            </div>
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
                        <h1 className="text-3xl font-bold text-gray-800">汇记 (hui-ji)</h1>
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
                                        兑换方向
                                    </label>
                                    <select
                                        value={newDirection}
                                        onChange={(e) => setNewDirection(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="cny_to_aud">🔵 买入澳元（CNY → AUD）</option>
                                        <option value="aud_to_cny">🔴 卖出澳元（AUD → CNY）</option>
                                    </select>
                                </div>
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
                                        {newDirection === 'cny_to_aud' ? '获得澳元金额 (AUD)' : '支出澳元金额 (AUD)'}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        备注（可选）
                                    </label>
                                    <input
                                        type="text"
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="例如: 学费、生活费、朋友借钱"
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
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={editDirection}
                                                            onChange={(e) => setEditDirection(e.target.value)}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="cny_to_aud">🔵 买入</option>
                                                            <option value="aud_to_cny">🔴 卖出</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            step="0.0001"
                                                            value={editRate}
                                                            onChange={(e) => setEditRate(e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                            placeholder="汇率"
                                                        />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editAmount}
                                                            onChange={(e) => setEditAmount(e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                            placeholder="金额"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editNote}
                                                            onChange={(e) => setEditNote(e.target.value)}
                                                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                            placeholder="备注"
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
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">
                                {(item.direction || 'cny_to_aud') === 'cny_to_aud' ? '🔵' : '🔴'}
                              </span>
                                                            <span className="font-medium">{item.rate.toFixed(4)}</span>
                                                            <span className="text-gray-600">
                                {item.amount.toFixed(2)} AUD
                              </span>
                                                            <span className="text-xs text-gray-500">
                                {(item.direction || 'cny_to_aud') === 'cny_to_aud' ? '买入' : '卖出'}
                              </span>
                                                        </div>
                                                        {item.note && (
                                                            <div className="text-sm text-gray-500 ml-6">
                                                                💬 {item.note}
                                                            </div>
                                                        )}
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
                                <p className="text-sm text-gray-500">基于净持有成本</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">兑换次数</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {statistics.exchangeCount}
                                </p>
                                <p className="text-sm text-gray-500">总交易记录</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">澳元净持有</h3>
                                <p className={`text-3xl font-bold ${statistics.netAmountAud >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {statistics.netAmountAud.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-500">买入 - 卖出</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">人民币净支出</h3>
                                <p className={`text-3xl font-bold ${statistics.netAmountCny >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {statistics.netAmountCny.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-500">支出 - 收入</p>
                            </div>
                        </div>

                        {/* 双向交易统计 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">双向交易统计</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-blue-800 mb-3">🔵 买入澳元 (CNY → AUD)</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">总买入澳元:</span> {statistics.totalAmountAudIn.toFixed(2)} AUD</p>
                                        <p><span className="font-medium">总支出人民币:</span> {statistics.totalAmountCnyOut.toFixed(2)} CNY</p>
                                        <p><span className="font-medium">平均买入汇率:</span> {statistics.totalAmountAudIn > 0 ? (statistics.totalAmountCnyOut / statistics.totalAmountAudIn).toFixed(4) : '0.0000'}</p>
                                    </div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-red-800 mb-3">🔴 卖出澳元 (AUD → CNY)</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">总卖出澳元:</span> {statistics.totalAmountAudOut.toFixed(2)} AUD</p>
                                        <p><span className="font-medium">总收入人民币:</span> {statistics.totalAmountCnyIn.toFixed(2)} CNY</p>
                                        <p><span className="font-medium">平均卖出汇率:</span> {statistics.totalAmountAudOut > 0 ? (statistics.totalAmountCnyIn / statistics.totalAmountAudOut).toFixed(4) : '0.0000'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 详细分析 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">详细分析</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-700">🔵 买入汇率比较</h3>
                                    <div className="space-y-2">
                                        <p>
                                            <span className="font-medium">最新买入汇率:</span> {statistics.latestBuyRate.toFixed(4)}
                                            {statistics.averageRateChange !== null && (
                                                <span className={`ml-2 text-sm ${statistics.averageRateChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          （本次兑换使得平均汇率{statistics.averageRateChange < 0 ? '下降' : '上升'}: {Math.abs(statistics.averageRateChange).toFixed(4)}）
                        </span>
                                            )}
                                        </p>
                                        <p>
                                            <span className="font-medium">最高买入汇率:</span> {statistics.highestBuyRate.toFixed(4)}
                                        </p>
                                        <p>
                                            <span className="font-medium">最低买入汇率:</span> {statistics.lowestBuyRate.toFixed(4)}
                                        </p>
                                        {statistics.previousBuyRate && (
                                            <p>
                                                <span className="font-medium">前一次买入汇率:</span> {statistics.previousBuyRate.toFixed(4)}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-500 mt-2">
                                            💡 买入次数: {statistics.buyCount} 次 / 总交易: {statistics.exchangeCount} 次
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-700">买入成本差异 (以2000澳元为基准)</h3>
                                    <div className="space-y-2">
                                        {statistics.differences.lastPrevious !== null && (
                                            <p>
                                                比前一次买入{statistics.differences.lastPrevious < 0 ? '便宜' : '贵'}了:
                                                <span className={`font-bold ml-1 ${statistics.differences.lastPrevious < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(statistics.differences.lastPrevious).toFixed(2)} CNY
                        </span>
                                            </p>
                                        )}
                                        <p>
                                            比最高买入汇率{statistics.differences.lastMax < 0 ? '便宜' : '贵'}了:
                                            <span className={`font-bold ml-1 ${statistics.differences.lastMax < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(statistics.differences.lastMax).toFixed(2)} CNY
                      </span>
                                        </p>
                                        <p>
                                            比最低买入汇率{statistics.differences.lastMin < 0 ? '便宜' : '贵'}了:
                                            <span className={`font-bold ml-1 ${statistics.differences.lastMin < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(statistics.differences.lastMin).toFixed(2)} CNY
                      </span>
                                        </p>
                                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                                            <p className="font-medium">📊 分析说明：</p>
                                            <p>此分析只关注买入澳元的汇率，帮助优化买入时机和成本控制</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 图表分析标签页 */}
                {activeTab === 'charts' && (
                    <div className="space-y-6">
                        {/* 综合汇率趋势图 */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">综合汇率趋势图</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <ComposedChart data={separatedRateData}>
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
                                        tickFormatter={(value) => Math.abs(value).toLocaleString()}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === '买入汇率' || name === '卖出汇率' || name === '平均汇率') {
                                                return value ? [value.toFixed(4), name] : [null, name];
                                            }
                                            if (name === '兑换金额 (AUD)') {
                                                const absValue = Math.abs(value);
                                                const direction = value >= 0 ? '买入' : '卖出';
                                                return [`${direction} ${absValue.toLocaleString()} AUD`, name];
                                            }
                                            return [value.toLocaleString(), name];
                                        }}
                                        labelFormatter={(label) => `第${label}次兑换`}
                                        labelStyle={{ color: '#374151' }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="buyRate"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: '#2563eb' }}
                                        connectNulls={true}
                                        name="买入汇率"
                                    />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="sellRate"
                                        stroke="#dc2626"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: '#dc2626' }}
                                        connectNulls={true}
                                        name="卖出汇率"
                                    />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="averageRate"
                                        stroke="#16a34a"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#16a34a' }}
                                        connectNulls={true}
                                        name="平均汇率"
                                    />
                                    <Bar
                                        yAxisId="amount"
                                        dataKey="amount"
                                        fill={(entry) => entry?.direction === 'aud_to_cny' ? '#ef4444' : '#3b82f6'}
                                        opacity={0.6}
                                        name="兑换金额 (AUD)"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>

                            {/* 图例说明 */}
                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 opacity-60 rounded"></div>
                                    <span>🔵 买入澳元</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 opacity-60 rounded"></div>
                                    <span>🔴 卖出澳元</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-blue-600 rounded"></div>
                                    <span>买入汇率趋势线</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-red-600 rounded"></div>
                                    <span>卖出汇率趋势线</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1 bg-green-600 rounded"></div>
                                    <span>平均汇率线（加粗）</span>
                                </div>
                            </div>

                            {/* 趋势分析说明 */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                <p className="font-medium mb-1">📈 趋势线说明：</p>
                                <p>• <span className="text-blue-600 font-medium">蓝色线</span>：连接所有买入汇率点，显示买入汇率变化趋势</p>
                                <p>• <span className="text-red-600 font-medium">红色线</span>：连接所有卖出汇率点，显示卖出汇率变化趋势</p>
                                <p>• <span className="text-green-600 font-medium">绿色实线</span>：累积平均汇率（加粗显示），反映整体持仓成本变化</p>
                            </div>
                        </div>

                        {/* 分离的买入/卖出图表 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* 买入澳元图表 */}
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    🔵 买入澳元记录 ({separatedData.buyData.length}次)
                                </h2>
                                {separatedData.buyData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <ComposedChart data={separatedData.buyData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="exchange" />
                                                <YAxis
                                                    yAxisId="rate"
                                                    orientation="left"
                                                    domain={chartRanges ? chartRanges.buy.rate : ['auto', 'auto']}
                                                    tickFormatter={(value) => value.toFixed(3)}
                                                />
                                                <YAxis
                                                    yAxisId="amount"
                                                    orientation="right"
                                                    domain={chartRanges ? chartRanges.buy.amount : ['auto', 'auto']}
                                                    tickFormatter={(value) => value.toLocaleString()}
                                                />
                                                <Tooltip
                                                    formatter={(value, name) => {
                                                        if (name === '买入汇率') {
                                                            return [value.toFixed(4), name];
                                                        }
                                                        return [value.toLocaleString(), name];
                                                    }}
                                                    labelFormatter={(label) => `第${label}次买入`}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                        border: '1px solid #3b82f6',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Legend />
                                                <Line
                                                    yAxisId="rate"
                                                    type="monotone"
                                                    dataKey="rate"
                                                    stroke="#2563eb"
                                                    strokeWidth={2}
                                                    dot={{ r: 4, fill: '#2563eb' }}
                                                    name="买入汇率"
                                                />
                                                <Bar
                                                    yAxisId="amount"
                                                    dataKey="amount"
                                                    fill="#3b82f6"
                                                    opacity={0.6}
                                                    name="买入金额 (AUD)"
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>

                                        {/* 买入统计 */}
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-blue-50 p-3 rounded">
                                                <p className="text-blue-700 font-medium">总买入澳元</p>
                                                <p className="text-blue-900 font-bold">
                                                    {separatedData.buyData.reduce((sum, item) => sum + item.amount, 0).toFixed(2)} AUD
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded">
                                                <p className="text-blue-700 font-medium">平均买入汇率</p>
                                                <p className="text-blue-900 font-bold">
                                                    {statistics?.totalAmountAudIn > 0 ? (statistics.totalAmountCnyOut / statistics.totalAmountAudIn).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded">
                                                <p className="text-blue-700 font-medium">最高买入汇率</p>
                                                <p className="text-blue-900 font-bold">
                                                    {separatedData.buyData.length > 0 ? Math.max(...separatedData.buyData.map(d => d.rate)).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded">
                                                <p className="text-blue-700 font-medium">最低买入汇率</p>
                                                <p className="text-blue-900 font-bold">
                                                    {separatedData.buyData.length > 0 ? Math.min(...separatedData.buyData.map(d => d.rate)).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <p className="text-lg">📊 暂无买入记录</p>
                                            <p className="text-sm mt-2">添加一些买入澳元的记录来查看图表</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 卖出澳元图表 */}
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    🔴 卖出澳元记录 ({separatedData.sellData.length}次)
                                </h2>
                                {separatedData.sellData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <ComposedChart data={separatedData.sellData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="exchange" />
                                                <YAxis
                                                    yAxisId="rate"
                                                    orientation="left"
                                                    domain={chartRanges ? chartRanges.sell.rate : ['auto', 'auto']}
                                                    tickFormatter={(value) => value.toFixed(3)}
                                                />
                                                <YAxis
                                                    yAxisId="amount"
                                                    orientation="right"
                                                    domain={chartRanges ? chartRanges.sell.amount : ['auto', 'auto']}
                                                    tickFormatter={(value) => value.toLocaleString()}
                                                />
                                                <Tooltip
                                                    formatter={(value, name) => {
                                                        if (name === '卖出汇率') {
                                                            return [value.toFixed(4), name];
                                                        }
                                                        return [value.toLocaleString(), name];
                                                    }}
                                                    labelFormatter={(label) => `第${label}次卖出`}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid #ef4444',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Legend />
                                                <Line
                                                    yAxisId="rate"
                                                    type="monotone"
                                                    dataKey="rate"
                                                    stroke="#dc2626"
                                                    strokeWidth={2}
                                                    dot={{ r: 4, fill: '#dc2626' }}
                                                    name="卖出汇率"
                                                />
                                                <Bar
                                                    yAxisId="amount"
                                                    dataKey="amount"
                                                    fill="#ef4444"
                                                    opacity={0.6}
                                                    name="卖出金额 (AUD)"
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>

                                        {/* 卖出统计 */}
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-red-50 p-3 rounded">
                                                <p className="text-red-700 font-medium">总卖出澳元</p>
                                                <p className="text-red-900 font-bold">
                                                    {separatedData.sellData.reduce((sum, item) => sum + item.amount, 0).toFixed(2)} AUD
                                                </p>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded">
                                                <p className="text-red-700 font-medium">平均卖出汇率</p>
                                                <p className="text-red-900 font-bold">
                                                    {statistics?.totalAmountAudOut > 0 ? (statistics.totalAmountCnyIn / statistics.totalAmountAudOut).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded">
                                                <p className="text-red-700 font-medium">最高卖出汇率</p>
                                                <p className="text-red-900 font-bold">
                                                    {separatedData.sellData.length > 0 ? Math.max(...separatedData.sellData.map(d => d.rate)).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded">
                                                <p className="text-red-700 font-medium">最低卖出汇率</p>
                                                <p className="text-red-900 font-bold">
                                                    {separatedData.sellData.length > 0 ? Math.min(...separatedData.sellData.map(d => d.rate)).toFixed(4) : '0.0000'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <p className="text-lg">📊 暂无卖出记录</p>
                                            <p className="text-sm mt-2">添加一些卖出澳元的记录来查看图表</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 买卖对比分析 */}
                        {separatedData.buyData.length > 0 && separatedData.sellData.length > 0 && (
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">💰 买卖对比分析</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-red-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-3">汇率差异</h3>
                                        <div className="space-y-2 text-sm">
                                            <p>
                                                <span className="text-blue-600">平均买入:</span>
                                                <span className="font-bold ml-1">{(statistics.totalAmountCnyOut / statistics.totalAmountAudIn).toFixed(4)}</span>
                                            </p>
                                            <p>
                                                <span className="text-red-600">平均卖出:</span>
                                                <span className="font-bold ml-1">{(statistics.totalAmountCnyIn / statistics.totalAmountAudOut).toFixed(4)}</span>
                                            </p>
                                            <p className="pt-2 border-t">
                                                <span className="text-gray-600">汇率差:</span>
                                                <span className={`font-bold ml-1 ${(statistics.totalAmountCnyIn / statistics.totalAmountAudOut) - (statistics.totalAmountCnyOut / statistics.totalAmountAudIn) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((statistics.totalAmountCnyIn / statistics.totalAmountAudOut) - (statistics.totalAmountCnyOut / statistics.totalAmountAudIn)).toFixed(4)}
                        </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-3">交易收益</h3>
                                        <div className="space-y-2 text-sm">
                                            <p>
                                                <span className="text-gray-600">已实现收益:</span>
                                            </p>
                                            <p className="text-lg font-bold text-green-600">
                                                {(statistics.totalAmountCnyIn - (statistics.totalAmountAudOut * (statistics.totalAmountCnyOut / statistics.totalAmountAudIn))).toFixed(2)} CNY
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                基于平均买入成本计算
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-3">持仓价值</h3>
                                        <div className="space-y-2 text-sm">
                                            <p>
                                                <span className="text-gray-600">净持有澳元:</span>
                                                <span className="font-bold ml-1 text-blue-600">{statistics.netAmountAud.toFixed(2)} AUD</span>
                                            </p>
                                            <p>
                                                <span className="text-gray-600">按最新汇率:</span>
                                                <span className="font-bold ml-1 text-green-600">{(statistics.netAmountAud * statistics.latestBuyRate).toFixed(2)} CNY</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 人民币支出图（只显示买入澳元） */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                🔵 买入澳元人民币支出图 (以2000澳元为基准)
                            </h2>
                            {separatedData.buyData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={separatedData.buyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="exchange"
                                                tickFormatter={(value) => `第${value}次`}
                                            />
                                            <YAxis
                                                domain={chartRanges ? chartRanges.buy.cny : ['auto', 'auto']}
                                                tickFormatter={(value) => `¥${value.toFixed(0)}`}
                                            />
                                            <Tooltip
                                                formatter={(value) => [`¥${value.toFixed(2)}`, '买入支出']}
                                                labelFormatter={(label) => `第${label}次买入澳元`}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid #3b82f6',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Bar
                                                dataKey="cnyForBase"
                                                fill="#3b82f6"
                                                stroke="#2563eb"
                                                strokeWidth={1}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* 买入支出统计信息 */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <p className="text-blue-700 font-medium">最高买入支出</p>
                                            <p className="text-blue-900 font-bold">
                                                ¥{Math.max(...separatedData.buyData.map(d => d.cnyForBase)).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <p className="text-green-700 font-medium">最低买入支出</p>
                                            <p className="text-green-900 font-bold">
                                                ¥{Math.min(...separatedData.buyData.map(d => d.cnyForBase)).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded">
                                            <p className="text-purple-700 font-medium">支出差额</p>
                                            <p className="text-purple-900 font-bold">
                                                ¥{(Math.max(...separatedData.buyData.map(d => d.cnyForBase)) - Math.min(...separatedData.buyData.map(d => d.cnyForBase))).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded">
                                            <p className="text-orange-700 font-medium">最新买入支出</p>
                                            <p className="text-orange-900 font-bold">
                                                ¥{separatedData.buyData[separatedData.buyData.length - 1]?.cnyForBase.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 说明 */}
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                        <p className="font-medium mb-1">📊 图表说明：</p>
                                        <p>• 此图表只显示买入澳元时的人民币支出情况</p>
                                        <p>• 以2000澳元为标准基准，方便对比不同汇率下的成本</p>
                                        <p>• 卖出澳元的收益情况请查看上方的卖出专门图表</p>
                                    </div>
                                </>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <p className="text-lg">📊 暂无买入记录</p>
                                        <p className="text-sm mt-2">添加一些买入澳元的记录来查看支出分析</p>
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