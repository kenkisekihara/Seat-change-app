import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Shuffle, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  RefreshCcw,
  Info,
  FileDown,
  Lock,
  Ban
} from 'lucide-react';
import { Student, Seat, Gender } from './types';
import { ROWS, COLS, DEFAULT_STUDENTS } from './constants';
import SeatCard from './components/SeatCard';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [swapIds, setSwapIds] = useState({ id1: '', id2: '' });
  const [isExporting, setIsExporting] = useState(false);

  // 初期配置
  const initializeSeats = useCallback((studentList: Student[]) => {
    const newSeats: Seat[] = [];
    let studentIndex = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        newSeats.push({
          row: r,
          col: c,
          student: studentList[studentIndex] || null,
          isLocked: false,
          isUnusable: false
        });
        studentIndex++;
      }
    }
    setSeats(newSeats);
  }, []);

  useEffect(() => {
    initializeSeats(students);
  }, [initializeSeats]);

  // シャッフル（空席を後ろに詰めるロジック）
  const handleShuffle = () => {
    // 1. 固定されていない、かつ使用可能な座席のインデックスを取得（前列から順）
    const targetIndices = seats.reduce((acc, seat, idx) => {
      if (!seat.isLocked && !seat.isUnusable) acc.push(idx);
      return acc;
    }, [] as number[]);

    // 2. 現在それらの座席にいる生徒を抽出
    const studentsInPlay = seats
      .filter((_, idx) => targetIndices.includes(idx))
      .map(s => s.student)
      .filter((s): s is Student => s !== null);

    if (targetIndices.length < studentsInPlay.length) {
      alert("座席数が不足しています。");
      return;
    }

    // 3. 生徒をランダムに並び替え
    const shuffledStudents = [...studentsInPlay].sort(() => Math.random() - 0.5);

    // 4. 新しい配置を適用
    const newSeats = [...seats];
    
    // 一旦対象座席をクリア
    targetIndices.forEach(idx => {
      newSeats[idx].student = null;
    });

    // 前列（インデックスの若い順）から生徒を詰めて配置
    // これにより、余った座席（空席）は必ず後ろ（インデックスの大きい順）に残る
    shuffledStudents.forEach((student, i) => {
      const seatIdx = targetIndices[i];
      newSeats[seatIdx].student = student;
    });

    setSeats(newSeats);
    setSelectedSeatIndex(null);
  };

  const handleToggleLock = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (seats[index].isUnusable) return;
    const newSeats = [...seats];
    newSeats[index].isLocked = !newSeats[index].isLocked;
    setSeats(newSeats);
    if (selectedSeatIndex === index) setSelectedSeatIndex(null);
  };

  const handleToggleUnusable = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSeats = [...seats];
    const targetSeat = newSeats[index];
    if (!targetSeat.isUnusable) {
      targetSeat.isLocked = false;
      targetSeat.student = null;
    }
    targetSeat.isUnusable = !targetSeat.isUnusable;
    setSeats(newSeats);
    if (selectedSeatIndex === index) setSelectedSeatIndex(null);
  };

  const handleSeatClick = (index: number) => {
    if (seats[index].isLocked || seats[index].isUnusable) return;
    if (selectedSeatIndex === null) {
      setSelectedSeatIndex(index);
    } else {
      const newSeats = [...seats];
      const temp = newSeats[selectedSeatIndex].student;
      newSeats[selectedSeatIndex].student = newSeats[index].student;
      newSeats[index].student = temp;
      setSeats(newSeats);
      setSelectedSeatIndex(null);
    }
  };

  const handleManualSwap = () => {
    const { id1, id2 } = swapIds;
    if (!id1 || !id2) return;
    const idx1 = seats.findIndex(s => s.student?.id === id1);
    const idx2 = seats.findIndex(s => s.student?.id === id2);
    if (idx1 === -1 || idx2 === -1) {
      alert("学籍番号が見つかりません。");
      return;
    }
    if (seats[idx1].isLocked || seats[idx2].isLocked || seats[idx1].isUnusable || seats[idx2].isUnusable) {
      alert("固定/不可の座席は入れ替えられません。");
      return;
    }
    const newSeats = [...seats];
    const temp = newSeats[idx1].student;
    newSeats[idx1].student = newSeats[idx2].student;
    newSeats[idx2].student = temp;
    setSeats(newSeats);
    setSwapIds({ id1: '', id2: '' });
  };

  const downloadTemplate = () => {
    const data = [
      { "学籍番号": "1001", "名前": "佐藤 健一", "選択科目": "物理", "性別": "男" },
      { "学籍番号": "1002", "名前": "田中 美咲", "選択科目": "生物", "性別": "女" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "席替えテンプレート.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];
      const imported = json.map((row: any) => ({
        id: String(row['学籍番号'] || row['id'] || ''),
        name: String(row['名前'] || row['name'] || '不明'),
        subject: String(row['選択科目'] || row['subject'] || ''),
        gender: ((row['性別'] === '女' || row['gender'] === 'female') ? '女' : '男') as Gender
      })).filter(s => s.id);
      setStudents(imported);
      initializeSeats(imported);
    };
    reader.readAsBinaryString(file);
  };

  // Excel出力（視認性向上）
  const exportExcel = () => {
    const tableData = [];
    // ヘッダー
    const header = [];
    for (let c = 0; c < COLS; c++) header.push(`${c + 1}列目`);
    tableData.push(header);

    for (let r = 0; r < ROWS; r++) {
      const rowArr = [];
      for (let c = 0; c < COLS; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        if (seat?.isUnusable) {
          rowArr.push("使用不可");
        } else if (seat?.student) {
          rowArr.push(`${seat.student.name} (${seat.student.id})`);
        } else {
          rowArr.push("(空席)");
        }
      }
      tableData.push(rowArr);
    }

    const ws = XLSX.utils.aoa_to_sheet(tableData);
    // セル幅の調整 (25文字分)
    ws['!cols'] = Array(COLS).fill({ wch: 25 });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "座席表");
    XLSX.writeFile(wb, "座席表_出力.xlsx");
  };

  // PDF出力（html2canvasを使用し、日本語文字化けを回避）
  const exportPDF = async () => {
    const element = document.getElementById('seating-grid-container');
    if (!element) return;
    
    setIsExporting(true);
    try {
      const { default: html2canvas } = await import('https://esm.sh/html2canvas@^1.4.1');
      const { jsPDF } = await import('https://esm.sh/jspdf@^2.5.1');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;

      pdf.text("最終座席表", 10, 10);
      pdf.addImage(imgData, 'PNG', 0, 15, width, height);
      pdf.save("座席表.pdf");
    } catch (err) {
      console.error(err);
      alert("PDFの生成に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <RefreshCcw size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">スマート席替え Pro</h1>
          </div>
          <button 
            onClick={handleShuffle}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Shuffle size={16} />
            シャッフル (空席は後方へ)
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 flex flex-col gap-6 no-print">
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Upload size={16} /> 名簿インポート
            </h2>
            <button 
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold border border-blue-100 transition-colors mb-4"
            >
              <FileDown size={14} /> ひな形をDL
            </button>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <FileSpreadsheet className="text-slate-400 mb-1" size={24} />
              <p className="text-xs text-slate-500 font-bold">ファイルをドロップ</p>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </section>

          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} /> 指定入れ替え
            </h2>
            <div className="space-y-3">
              <input 
                type="text" placeholder="学籍番号1" value={swapIds.id1}
                onChange={(e) => setSwapIds({...swapIds, id1: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input 
                type="text" placeholder="学籍番号2" value={swapIds.id2}
                onChange={(e) => setSwapIds({...swapIds, id2: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button 
                onClick={handleManualSwap}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-md text-sm font-medium transition-colors"
              >
                入れ替え実行
              </button>
            </div>
          </section>
        </aside>

        <section className="lg:col-span-3">
          <div id="seating-grid-container" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="mb-8 text-center border-b pb-4">
              <div className="inline-block px-12 py-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-sm">
                教卓 (FRONT)
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4 min-w-[700px]">
              {seats.map((seat, index) => (
                <SeatCard
                  key={index}
                  student={seat.student}
                  row={seat.row}
                  col={seat.col}
                  isSelected={selectedSeatIndex === index}
                  isLocked={seat.isLocked}
                  isUnusable={seat.isUnusable}
                  onClick={() => handleSeatClick(index)}
                  onToggleLock={(e) => handleToggleLock(index, e)}
                  onToggleUnusable={(e) => handleToggleUnusable(index, e)}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 no-print">
              <div className="flex items-center justify-between text-slate-400 text-xs italic">
                <div className="flex items-center gap-1">
                  <Info size={14} />
                  シャッフル実行時、空席は自動的に教室の後方に集約されます。
                </div>
                <div>生徒: {students.length}名 / 総数: {ROWS * COLS}</div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[11px] text-indigo-600"><Lock size={12}/> 固定済み</div>
                <div className="flex items-center gap-2 text-[11px] text-red-600"><Ban size={12}/> 使用不可</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 no-print">
            <button 
              onClick={exportExcel}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet size={20} /> Excel出力
            </button>
            <button 
              onClick={exportPDF}
              disabled={isExporting}
              className={`flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExporting ? <RefreshCcw size={20} className="animate-spin" /> : <FileText size={20} />}
              {isExporting ? 'PDF作成中...' : 'PDFで保存'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;