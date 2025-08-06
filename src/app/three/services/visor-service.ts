import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { LASLoader } from '@loaders.gl/las';
import { load } from '@loaders.gl/core';

@Injectable({
  providedIn: 'root'
})
export class VisorService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private model: THREE.Object3D | null = null

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

      const pointTexture = new THREE.TextureLoader().load(this.generateCircleSprite());

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
        size: 0.2,
        vertexColors: geometry.hasAttribute('color'),
        sizeAttenuation: true,
        map: pointTexture,
        alphaTest: 0.1,
        transparent: true,
        blending: THREE.NormalBlending
      });

      this.model = new THREE.Points(geometry, material);
      this.scene.add(this.model);

      this.fitModelToView();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error al cargar LAS: ${error}`);
    }
  }

  clearPreviousModel(): void {
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

  fitModelToView(): void {
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

    // Actualizar controles
    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.update();
    }

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

   generateCircleSprite(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL();
  }
}
