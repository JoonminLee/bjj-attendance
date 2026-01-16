
import React, { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { faceRecognitionService } from '../services/faceRecognition';

export const Developer: React.FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const members = storageService.getMembers();
    const currentTotal = members.length;

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsGenerating(true);
        try {
            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 100);
            if (imageFiles.length === 0) {
                alert("선택한 폴더에 이미지 파일이 없습니다.");
                setIsGenerating(false);
                return;
            }
            const imagePool: string[] = [];
            const descriptorPool: number[][] = [];

            // Load models first
            await faceRecognitionService.loadModels();

            for (const file of imageFiles) {
                try {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });

                    const resized = await storageService.resizeImage(dataUrl, 512);

                    // AI 분석
                    const img = new Image();
                    img.src = resized;
                    await new Promise(r => img.onload = r);
                    const descriptor = await faceRecognitionService.extractDescriptor(img);

                    if (descriptor) {
                        imagePool.push(resized);
                        descriptorPool.push(descriptor);
                    } else {
                        console.warn("Face not detected, skipping image:", file.name);
                    }
                } catch (err) { console.warn("AI Analysis failed for file:", err); }
            }

            if (imagePool.length === 0) {
                alert("선택한 폴더의 사진들에서 얼굴을 하나도 찾지 못했습니다. 사진 규격을 확인해 주세요.");
                setIsGenerating(false);
                return;
            }

            const count = storageService.generateDummyMembers(imagePool.length, imagePool, descriptorPool);
            alert(`${count}명의 AI 분석이 완료된 관원이 생성되었습니다.`);
            window.location.reload();
        } catch (err: any) {
            alert(`오류: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        storageService.clearDummyMembers();
        alert('더미 데이터가 삭제되었습니다.');
        window.location.reload();
    };

    const runBenchmark = async (n: number, isReal: boolean = false) => {
        setIsGenerating(true);
        try {
            await faceRecognitionService.loadModels();
            const start = performance.now();
            const dummyQuery = Array.from({ length: 128 }, () => Math.random());
            const dummyMembers = Array.from({ length: n }, (_, i) => ({
                id: `test-${i}`,
                faceDescriptor: Array.from({ length: 128 }, () => Math.random())
            })) as any;

            faceRecognitionService.findBestMatch(dummyQuery, dummyMembers);
            const end = performance.now();
            const time = (end - start).toFixed(4);

            if (isReal) {
                alert(`[실제 AI 인식 엔진 측정]\n대상 인원: ${n}명\n연산 속도: ${time}ms`);
            }
        } catch (err) {
            alert("벤치마크 수행 중 오류 발생");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Layout role="admin">
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">실험실 (BETA)</h2>
                <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[11px]">시스템 성능 테스트 및 AI 데이터셋 관리 구역</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Mock Data Generator */}
                <div className="bg-white p-10 rounded-[56px] shadow-sm border border-slate-100 flex flex-col justify-between border-b-[12px] border-b-blue-600 transition-all hover:shadow-2xl">
                    <div>
                        <div className="flex items-center space-x-5 mb-10">
                            <div className="w-16 h-16 rounded-[28px] bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                                <i className="fas fa-database text-2xl"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">데이터 생성기</h3>
                                <p className="text-[11px] text-blue-500 font-bold uppercase tracking-widest mt-1">현재 활성 관원: {currentTotal}명</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[36px] mb-10 border border-slate-100 flex-1 flex flex-col justify-center">
                            <p className="text-sm text-slate-700 font-bold leading-relaxed">
                                <i className="fas fa-magic mr-3 text-blue-600 block mb-3 text-2xl"></i>
                                얼굴 사진이 포함된 폴더를 선택하면, 각 사진 속의 얼굴을 AI가 분석하여 실제 인식 가능한 더미 데이터를 생성합니다.<br />
                                <span className="text-xs text-slate-400 font-medium mt-2 block">100장 미만의 이미지를 권장합니다.</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input type="file" // @ts-ignore
                                webkitdirectory="" directory="" className="hidden" ref={folderInputRef} onChange={handleFolderUpload} />
                            <button onClick={() => folderInputRef.current?.click()} className="w-full py-7 bg-blue-600 hover:bg-blue-700 text-white rounded-[32px] font-black text-base uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center space-x-4 border-b-8 border-blue-900 active:scale-95">
                                <i className="fas fa-folder-tree text-xl"></i>
                                <span>폴더 데이터셋 등록</span>
                            </button>
                        </div>
                        <button onClick={handleClear} className="w-full py-5 text-slate-400 hover:bg-red-50 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:text-red-500">모든 시뮬레이션 데이터 삭제</button>
                    </div>
                </div>

                {/* Algorithm Benchmark */}
                <div className="bg-[#0f172a] p-12 rounded-[56px] shadow-2xl relative overflow-hidden group border-b-[12px] border-b-slate-950">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                        <i className="fas fa-microchip text-[14rem] text-white"></i>
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center space-x-4 mb-12">
                                <div className="w-14 h-14 rounded-3xl bg-white/10 text-blue-400 flex items-center justify-center shadow-inner border border-white/5"><i className="fas fa-bolt text-2xl"></i></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">성능 벤치마크</h3>
                                    <p className="text-[11px] text-blue-400/50 font-black uppercase tracking-widest mt-1">실시간 AI 엔진 퍼포먼스 측정</p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-[40px] p-10 mb-10 border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer group/card backdrop-blur-sm" onClick={() => runBenchmark(currentTotal, true)}>
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 opacity-60">엔진 부하 테스트</p>
                                        <h4 className="text-4xl font-black text-white italic leading-tight">전체 인원<br />시뮬레이션 시작</h4>
                                    </div>
                                    <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-xl shadow-blue-950 transition-transform border-t border-white/20">
                                        <i className="fas fa-play text-white text-2xl"></i>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 flex-1 text-center">
                                        <span className="text-[10px] font-black text-blue-400/50 uppercase block mb-1.5">테스트 대상</span>
                                        <span className="text-2xl font-black text-white italic">{currentTotal}</span>
                                    </div>
                                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 flex-1 text-center">
                                        <span className="text-[10px] font-black text-blue-400/50 uppercase block mb-1.5">정밀도</span>
                                        <span className="text-lg font-bold text-blue-100 italic">F32 Vector</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center space-x-3 text-slate-600 font-black uppercase tracking-[0.2em] italic text-[10px]">
                            <i className="fas fa-shield-halved"></i>
                            <p>Pure mathematical inference measurement</p>
                        </div>
                    </div>
                </div>
            </div>
            {isGenerating && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-20 h-20 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-2xl"></div>
                        <p className="text-white font-black uppercase tracking-[0.3em] text-base mb-2">AI Neural Engine Loading...</p>
                    </div>
                </div>
            )}
        </Layout>
    );
};
