import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { VisorService } from './services/visor-service';
import { MessageService } from 'primeng/api';
import { ThreeBases } from './models/three-bases'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LASLoader } from '@loaders.gl/las';
import { load } from '@loaders.gl/core';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { Tooltip } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-three',
  imports: [CommonModule, FormsModule, ButtonModule, PanelModule, Tooltip, ToastModule],
  templateUrl: './three.html',
  styleUrl: './three.css'
})
export class Three implements AfterViewInit {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;
  @ViewChild(Tooltip) tooltip!: Tooltip
  optionsVisibility: boolean = false;
  showGrid: boolean = true
  backgroundColor: number = 0x030303
  formats: ThreeBases[] | undefined

  selectedFormat: ThreeBases | undefined
  toolTipText: string = 'Formato de archivo para modelos 3D'

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private model: THREE.Object3D | null = null
  private gridHelper!: THREE.GridHelper

  private formatDesc: { [key: string]: string } = {
    '3dm': 'Formato de archivo nativo de Rhino 3D. Almacenan información sobre la geometría, las superficies, los puntos y las curvas de un modelo 3D, así como metadatos y otros detalles de formato.',
    'obj': 'Formato de geometría 3D universal, que describe la forma de un objeto 3D especificando la posición de sus vértices, la información de la textura y otros datos geométricos. ',
    'gltf': 'Formato moderno y optimizado para Web y motores gráficos. Está diseñado para la distribución eficiente e interoperable de contenido 3D.',
    'fbx': 'Formato popular de Autodesk para intercambio de modelos 3D.',
    'las': 'Formato de archivo para datos de nubes de puntos LiDAR.',
  }

  constructor(private visorService: VisorService, private messageService: MessageService) { }

  ngOnInit(): void {
    this.formats = [
      { name: '3DM', value: '3dm' },
      { name: 'IFC', value: 'ifc' },
      { name: 'LAS', value: 'las' }
    ]
  }

  ngAfterViewInit() {
    this.initScene()
    this.setupControls()
    this.animate()
  }

  showOptions() {
    this.optionsVisibility = !this.optionsVisibility
  }

  onFormatChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement
    const selectedFormat = selectElement.value

    this.toolTipText = this.formatDesc[selectedFormat]
  }

  toggleGrid(visible: boolean): void {
    this.showGrid = visible
    if (this.gridHelper) {
      this.gridHelper.visible = visible
    }
  }

  onBackgroundColorChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      this.setBackgroundColor(inputElement.value);
    }
  }

  getBackgroundColor(): string {
    return `${this.backgroundColor.toString(16).padStart(6, '0')}`
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) return

    const format = (document.querySelector('#formatSelector') as HTMLSelectElement).value

    switch (format) {
      case '3dm':
        this.load3DM(file)
        break;
      case 'fbx':
        this.loadFBX(file)
        break;
      case 'gltf':
        this.loadGLTF(file)
        break;
      case 'obj':
        this.loadOBJ(file)
        break;
      case 'las':
        this.loadLAS(file)
        break;
      default:
        this.messageService.add({ severity: 'error', summary: 'Error', text: 'Error: \n Formato no soportado' })
    }
  }

  loadOBJ(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'obj') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Formato',
        detail: 'El archivo no es de formato OBJ. Por favor, suba un archivo .obj'
      });
      return;
    }

    try {
      const reader = new FileReader();
      const loader = new OBJLoader();

      reader.onload = (e) => {
        this.clearPreviousModel();
        const url = e.target?.result as string;
        this.model = loader.parse(url);
        this.scene.add(this.model);
        this.fitModelToView();
      };

      reader.readAsText(file);

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Carga',
        detail: 'Ocurrió un error al cargar el modelo OBJ.'
      });
      console.error(error);
    }
  }

  loadFBX(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'fbx') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Formato',
        detail: 'El archivo no es de formato FBX. Por favor, suba un archivo .fbx'
      });
      return;
    }

    try {
      const loader = new FBXLoader()
      const url = URL.createObjectURL(file)

      loader.load(url, (fbx) => {
        this.clearPreviousModel()
        this.scene.add(fbx)
        this.fitModelToView()
      })

      URL.revokeObjectURL(url)
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El formato ingresado no es valido, asegurese de subir el formato correcto (FBX)' })
    }
  }

  loadGLTF(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'gltf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Formato',
        detail: 'El archivo no es de formato glTF. Por favor, suba un archivo .gltf'
      });
      return;
    }

    try {
      const loader = new GLTFLoader()
      const url = URL.createObjectURL(file)

      loader.load(url, (gltf) => {
        this.clearPreviousModel()
        this.scene.add(gltf.scene)
        this.fitModelToView()
      })
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El formato ingresado no es valido, asegurese de subir el formato correcto (glTF)' })
    }
  }

  async loadLAS(file: File): Promise<void> {
    try {
      const url = URL.createObjectURL(file);
      this.clearPreviousModel();
      const { attributes } = await load(url, LASLoader, {
        las: {
          colorDepth: "auto", // Default
          fp64: 32,
          skip: 1
        }
      });

      const geometry = new THREE.BufferGeometry();

      if (!attributes['POSITION']) {
        throw new Error('El archivo LAS no contiene datos de posición (POSITION).');
      }
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(attributes['POSITION'].value, 3)
      );

      const pointTexture = new THREE.TextureLoader().load(this.visorService.generateCircleSprite());

      if (attributes['COLOR_0']) {
        const colors = attributes['COLOR_0'].value;
        const colorSize = attributes['COLOR_0'].size;

        const rgbColors = new Float32Array(colors.length / colorSize * 3);
        let maxColorValue = 1;

        for (let i = 0, j = 0; i < colors.length; i += colorSize, j += 3) {
          rgbColors[j] = colors[i];
          rgbColors[j + 1] = colors[i + 1];
          rgbColors[j + 2] = colors[i + 2];

          if (rgbColors[j] > maxColorValue) maxColorValue = rgbColors[j];
          if (rgbColors[j + 1] > maxColorValue) maxColorValue = rgbColors[j + 1];
          if (rgbColors[j + 2] > maxColorValue) maxColorValue = rgbColors[j + 2];

        }
        if (maxColorValue === 0) maxColorValue = 1;

        for (let i = 0; i < rgbColors.length; i++) {
          rgbColors[i] /= maxColorValue;
        }
        geometry.setAttribute(
          'color',
          new THREE.Float32BufferAttribute(rgbColors, 3)
        );
      } else {
        console.warn('El archivo LAS no contiene atributos de color (COLOR_0). Se usará un color por defecto.');
      }

      const material = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: geometry.hasAttribute('color'),
        sizeAttenuation: true,
        map: pointTexture,
        alphaTest: 0.1,
        transparent: false,
        blending: THREE.NormalBlending
      });
      this.model = new THREE.Points(geometry, material);

      this.scene.add(this.model);

      this.fitModelToView();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El formato ingresado no es valido, asegurese de subir el formato correcto (LAS/LAZ)' })
    }
  }

  async load3DM(file: File): Promise<void> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== '3dm') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Formato',
        detail: 'El archivo no es de formato 3DM. Por favor, suba un archivo .3dm'
      });
      return;
    }

    try {
      const loader = new Rhino3dmLoader();
      const url = URL.createObjectURL(file);

      loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/')

      this.clearPreviousModel();
      const rhinoModel = await loader.loadAsync(url);
      this.model = rhinoModel;
      this.scene.add(this.model);
      this.fitModelToView();
      URL.revokeObjectURL(url);

    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El formato ingresado no es valido, asegurese de subir el formato correcto (3DM)' })
    }
  }

  exportPLY(): void {
    if (!this.model) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Debe subir un modelo para poder exportarlo a este formato' })
      return
    }

    const pointCloud = this.model as THREE.Points
    const exporter = new PLYExporter()

    exporter.parse(pointCloud, (result) => {
      const blob = new Blob([result], { type: 'text/plain' });
      const link = document.createElement('a');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.href = URL.createObjectURL(blob);
      link.download = 'exported-point-cloud.ply';
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
  }

  exportSTL(): void {
    if (!this.model) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Debe subir un modelo para poder exportarlo a este formato' })
      return
    }

    const mesh = this.model as THREE.Mesh
    const exporter = new STLExporter()

    const result = exporter.parse(mesh, { binary: true })
    const blob = new Blob([result], { type: 'application/octet-stream' })

    const link = document.createElement('a')
    link.style.display = 'none'
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = 'exported-model.stl';
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  deleteActualModel(): void {
    if (!this.model) {
      return
    }

    this.scene.remove(this.model)
    this.model = null
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;
    this.scene.background = new THREE.Color(this.backgroundColor);

    // Configuración de luces modificada para puntos
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Reducida intensidad
    this.scene.add(ambientLight);

    // Luz direccional más suave
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0.5, 0.5, 1).normalize();
    this.scene.add(directionalLight);

    // Luz adicional desde atrás para contrarrestar
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-0.5, -0.5, -1).normalize();
    this.scene.add(backLight);

    this.initGrid();

    // Deshabilitar sombras para optimización (no necesario para puntos)
    this.renderer.shadowMap.enabled = false;
  }

  private initGrid(): void {
    this.gridHelper = new THREE.GridHelper(1000, 1000, 0x888888, 0x444444)

    this.gridHelper.position.y = -0.01
    this.gridHelper.position.x = Math.PI / 2

    this.scene.add(this.gridHelper)
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Activa la inercia para un movimiento más suave
    this.controls.enableDamping = false;
  }

  private animate() {
    const renderLoop = () => {
      requestAnimationFrame(renderLoop);
      this.controls.update(); // Llama a 'update' en cada frame
      this.renderer.render(this.scene, this.camera);
    };

    renderLoop();
  }

  private clearPreviousModel(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  private fitModelToView(): void {
    if (!this.model) return;

    // Usar bounding sphere como fallback
    const box = new THREE.Box3().setFromObject(this.model);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const center = sphere.center;
    const size = sphere.radius;

    // Ajustar cámara
    this.camera.near = Math.max(size / 100, 0.001);
    this.camera.far = size * 100;
    this.camera.updateProjectionMatrix();

    // Posicionar cámara
    this.camera.position.copy(center);
    this.camera.position.z += size * 2;
    this.camera.lookAt(center);

    // Debug
    const sphereHelper = new THREE.SphereGeometry(sphere.radius, 16, 16);
    const helperMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: true
    });
    const helper = new THREE.Mesh(sphereHelper, helperMaterial);
    helper.position.copy(sphere.center);
    this.scene.add(helper);
    setTimeout(() => this.scene.remove(helper), 2000);
  }

  private setBackgroundColor(color: string): void {
    this.backgroundColor = parseInt(color.replace('#', '0x'))

    if (this.scene) {
      this.scene.background = new THREE.Color(this.backgroundColor)
    }
  }
}
