import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calculator, Zap, Monitor, Cpu, Server, LayoutGrid, ShoppingCart, Info, Wrench, Box, Image as ImageIcon, Upload, Trash2, Pause, Play } from 'lucide-react';

// --- COMPONENTE DO VISUALIZADOR 3D ---
const ThreeDViewer = ({ width, height, imageUrl }) => {
  const mountRef = useRef(null);
  const sceneRefs = useRef({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);

  const toggleRotation = () => {
    isRotatingRef.current = !isRotatingRef.current;
    setIsRotating(isRotatingRef.current);
  };

  useEffect(() => {
    let reqId;
    let renderer, scene, camera, controls;
    let mounted = true;

    const initThree = () => {
      const THREE = window.THREE;
      if (!mountRef.current || sceneRefs.current.scene) return;

      const widthPx = mountRef.current.clientWidth;
      const heightPx = mountRef.current.clientHeight;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 100);
      
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(widthPx, heightPx);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding; // Garante cores perfeitas
      mountRef.current.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 5, 5);
      scene.add(dirLight);

      const totem = new THREE.Group();
      scene.add(totem);

      const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.3 });
      
      // Tela como MeshBasicMaterial para não sofrer sombras
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const darkSideMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.8 });
      const screenMaterials = [darkSideMat, darkSideMat, darkSideMat, darkSideMat, screenMat, darkSideMat];

      const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cabinetMat);
      totem.add(cabinet);

      const screen = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), screenMaterials);
      totem.add(screen);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), baseMat);
      totem.add(base);

      // --- INICIALIZAR ORBIT CONTROLS (Zoom, Pan, Rotate) ---
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // Movimento com inércia/suavidade
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.autoRotateSpeed = 2.0;

      sceneRefs.current = { scene, camera, renderer, totem, cabinet, screen, base, screenMat, controls, hasSetInitialPos: false };
      setIsLoaded(true);

      const animate = () => {
        reqId = requestAnimationFrame(animate);
        
        if (controls) {
            // O OrbitControls lida automaticamente com a rotação contínua e interrompe 
            // graciosamente quando o utilizador está a interagir com o rato.
            controls.autoRotate = isRotatingRef.current;
            controls.update(); // Necessário chamar sempre quando o damping ou autoRotate estão ativos
        }
        
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current || !camera || !renderer) return;
        const newW = mountRef.current.clientWidth;
        const newH = mountRef.current.clientHeight;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    };

    // Carregar o Three.js e em seguida o plugin oficial OrbitControls
    const loadDependencies = async () => {
      if (!window.THREE) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      if (!window.THREE.OrbitControls) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      if (mounted) initThree();
    };

    loadDependencies();

    return () => {
      mounted = false;
      cancelAnimationFrame(reqId);
      if (mountRef.current && renderer) mountRef.current.removeChild(renderer.domElement);
      if (controls) controls.dispose();
    };
  }, []);

  // Efeito 2: Atualizar escalas dimensionais
  useEffect(() => {
    if (!isLoaded || !sceneRefs.current.cabinet) return;
    const { totem, cabinet, screen, base, camera, controls } = sceneRefs.current;
    
    const w = width / 100;
    const h = height / 100;
    const d = 0.13;

    cabinet.scale.set(w + 0.04, h + 0.04, d);
    screen.scale.set(w, h, 0.01);
    screen.position.z = d / 2 + 0.005;
    base.scale.set(w + 0.2, 0.04, d + 0.2);
    base.position.y = -(h + 0.04) / 2 - 0.02;
    totem.position.y = 0;

    const maxDim = Math.max(w, h);
    const distance = maxDim * 1.5 + 1.2;

    // Configurar a câmara mantendo o ângulo em que o utilizador a tiver deixado
    if (!sceneRefs.current.hasSetInitialPos) {
      // Posição inicial (ligeiramente de lado)
      camera.position.set(Math.sin(Math.PI / 8) * distance, maxDim * 0.2, Math.cos(Math.PI / 8) * distance);
      sceneRefs.current.hasSetInitialPos = true;
    } else {
      // Ajustar a distância (zoom) para a nova escala, sem alterar o ângulo de órbita
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() > 0.001) {
        offset.normalize().multiplyScalar(distance);
        camera.position.copy(controls.target).add(offset);
      }
    }
    
    if (controls) controls.update();

  }, [width, height, isLoaded]);

  // Efeito 3: Texturização da Imagem
  useEffect(() => {
    if (!isLoaded || !sceneRefs.current.screenMat) return;
    const THREE = window.THREE;
    const screenMat = sceneRefs.current.screenMat;

    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(imageUrl, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        screenMat.map = texture;
        screenMat.color.setHex(0xffffff);
        screenMat.needsUpdate = true;
      });
    } else {
      screenMat.map = null;
      screenMat.color.setHex(0x10b981);
      screenMat.needsUpdate = true;
    }
  }, [imageUrl, isLoaded]);

  return (
    <div ref={mountRef} className="w-full h-full min-h-[400px] lg:min-h-full cursor-grab active:cursor-grabbing rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative shadow-xl">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <Cpu className="w-6 h-6 animate-spin mr-3" /> Renderizando 3D...
        </div>
      )}
      {isLoaded && (
        <>
          <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 pointer-events-none backdrop-blur-sm flex items-center gap-2 border border-slate-700 z-10">
            <Box className="w-4 h-4" /> 3D: Girar, Zoom e Mover
          </div>
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={toggleRotation}
              className="bg-slate-900/80 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 backdrop-blur-sm transition-colors shadow-lg"
              title={isRotating ? "Pausar rotação" : "Retomar rotação"}
            >
              {isRotating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// --- APLICAÇÃO PRINCIPAL ---
export default function App() {
  const [videoWidth, setVideoWidth] = useState(64);
  const [videoHeight, setVideoHeight] = useState(176);
  const [imageUrl, setImageUrl] = useState(null);

  const calculations = useMemo(() => {
    const cols = Math.floor(videoWidth / 32);
    const rows = Math.floor(videoHeight / 16);
    const totalModules = cols * rows;
    const resWidth = cols * 128;
    const resHeight = rows * 64;
    const totalPixels = resWidth * resHeight;
    const maxPower = totalModules * 25; 
    const avgPower = maxPower * 0.35; 
    const powerSupplies = Math.ceil(maxPower / 160); 
    const receivingCards = Math.ceil(totalModules / 12);

    return { cols, rows, totalModules, resWidth, resHeight, totalPixels, maxPower, avgPower, powerSupplies, receivingCards };
  }, [videoWidth, videoHeight]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImageUrl(URL.createObjectURL(file));
  };

  const removeImage = () => setImageUrl(null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-3">
              <Monitor className="w-8 h-8 text-blue-400" /> Construtor 3D de Totem LED
            </h1>
            <p className="text-slate-400 mt-2">Dimensionamento em tempo real, cálculos elétricos e lista de materiais.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            <span className="font-mono">{calculations.cols} x {calculations.rows} Módulos</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl h-fit flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-blue-300">
              <Calculator className="w-5 h-5" /> Configurar Dimensões (P2.5)
            </h2>
            
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between">
                  <span>Largura da Área de Vídeo</span>
                  <span className="text-emerald-400 font-mono text-lg">{videoWidth} cm</span>
                </label>
                <input 
                  type="range" min="32" max="192" step="32" value={videoWidth}
                  onChange={(e) => setVideoWidth(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2 text-right">Passos de 32cm (1 módulo na horizontal)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between">
                  <span>Altura da Área de Vídeo</span>
                  <span className="text-emerald-400 font-mono text-lg">{videoHeight} cm</span>
                </label>
                <input 
                  type="range" min="16" max="320" step="16" value={videoHeight}
                  onChange={(e) => setVideoHeight(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2 text-right">Passos de 16cm (1 módulo na vertical)</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mt-8">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-emerald-400" /> Simular Conteúdo (Tela LED)
                </h4>
                {!imageUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 mb-2 text-slate-400" />
                      <p className="text-sm text-slate-300"><span className="font-semibold text-emerald-400">Clique para enviar</span> ou arraste</p>
                      <p className="text-xs text-slate-500">PNG, JPG, JPEG</p>
                    </div>
                    <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-3 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded overflow-hidden border border-slate-600">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm text-emerald-400 font-medium">Imagem Aplicada</span>
                    </div>
                    <button onClick={removeImage} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-400/10 px-2 py-1.5 rounded transition-colors">
                      <Trash2 className="w-4 h-4" /> Remover
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">Faça o upload de uma arte para ver como ela se ajusta no formato de tela configurado.</p>
              </div>
            </div>
          </div>

          <div className="h-[500px] lg:h-auto">
            <ThreeDViewer width={videoWidth} height={videoHeight} imageUrl={imageUrl} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <LayoutGrid className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-xs text-slate-400">Total de Módulos</p>
            <p className="text-xl font-bold text-white">{calculations.totalModules}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <Monitor className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-xs text-slate-400">Resolução Real</p>
            <p className="text-xl font-bold text-white">{calculations.resWidth}x{calculations.resHeight}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-xs text-slate-400">Consumo Máx.</p>
            <p className="text-xl font-bold text-white">{calculations.maxPower}W</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <Cpu className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-xs text-slate-400">Receiving Cards</p>
            <p className="text-xl font-bold text-white">{calculations.receivingCards}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <Wrench className="w-6 h-6 text-orange-400 mb-2" />
            <p className="text-xs text-slate-400">Fontes 5V</p>
            <p className="text-xl font-bold text-white">{calculations.powerSupplies}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
            <Server className="w-6 h-6 text-rose-400 mb-2" />
            <p className="text-xs text-slate-400">Media Player</p>
            <p className="text-xl font-bold text-white">1</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl overflow-hidden">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-emerald-400">
            <ShoppingCart className="w-5 h-5" /> Lista de Materiais Gerada (BOM)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-900 text-slate-300 text-sm border-b border-slate-700">
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium">Qtd. Necessária</th>
                  <th className="p-4 font-medium">Especificação</th>
                  <th className="p-4 font-medium">Onde Comprar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                <tr className="hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-medium text-white flex items-center gap-3"><LayoutGrid className="w-4 h-4 text-slate-400" /> Módulo P2.5 Indoor</td>
                  <td className="p-4"><span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-bold">{calculations.totalModules} un.</span></td>
                  <td className="p-4 text-slate-400">320x160mm, SMD2121, HUB75</td>
                  <td className="p-4"><a href="https://lista.mercadolivre.com.br/modulo-led-p2.5-indoor" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Buscar no ML</a></td>
                </tr>
                <tr className="hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-medium text-white flex items-center gap-3"><Cpu className="w-4 h-4 text-slate-400" /> Receiving Card</td>
                  <td className="p-4"><span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-bold">{calculations.receivingCards} un.</span></td>
                  <td className="p-4 text-slate-400">Novastar MRV328 ou MRV416</td>
                  <td className="p-4"><a href="https://lista.mercadolivre.com.br/novastar-mrv328" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Buscar no ML</a></td>
                </tr>
                <tr className="hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-medium text-white flex items-center gap-3"><Server className="w-4 h-4 text-slate-400" /> Media Player</td>
                  <td className="p-4"><span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-bold">1 un.</span></td>
                  <td className="p-4 text-slate-400">Novastar TB2, TB30 ou TB40</td>
                  <td className="p-4"><a href="https://pt.aliexpress.com/w/wholesale-novastar-tb30.html" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Buscar no Ali</a></td>
                </tr>
                <tr className="hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-medium text-white flex items-center gap-3"><Wrench className="w-4 h-4 text-slate-400" /> Fonte Chaveada</td>
                  <td className="p-4"><span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-bold">{calculations.powerSupplies} un.</span></td>
                  <td className="p-4 text-slate-400">5V 40A (200W) Slim Bivolt</td>
                  <td className="p-4"><a href="https://lista.mercadolivre.com.br/fonte-chaveada-5v-40a-200w-slim" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Buscar no ML</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}