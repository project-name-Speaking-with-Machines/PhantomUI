import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uHue;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // Noise function
  vec3 random3(vec3 c) {
    float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
    vec3 r;
    r.z = fract(512.0*j);
    j *= .125;
    r.x = fract(512.0*j);
    j *= .125;
    r.y = fract(512.0*j);
    return r-0.5;
  }

  float simplex3d(vec3 p) {
    const float F3 =  0.3333333;
    const float G3 =  0.1666667;
    
    vec3 s = floor(p + dot(p, vec3(F3)));
    vec3 x = p - s + dot(s, vec3(G3));
    
    vec3 e = step(vec3(0.0), x - x.yzx);
    vec3 i1 = e*(1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy*(1.0 - e);
    
    vec3 x1 = x - i1 + G3;
    vec3 x2 = x - i2 + 2.0*G3;
    vec3 x3 = x - 1.0 + 3.0*G3;
    
    vec4 w, d;
    
    w.x = dot(x, x);
    w.y = dot(x1, x1);
    w.z = dot(x2, x2);
    w.w = dot(x3, x3);
    
    w = max(0.6 - w, 0.0);
    
    d.x = dot(random3(s), x);
    d.y = dot(random3(s + i1), x1);
    d.z = dot(random3(s + i2), x2);
    d.w = dot(random3(s + 1.0), x3);
    
    w *= w;
    w *= w;
    d *= w;
    
    return dot(d, vec4(52.0));
  }

  float fbm(vec3 p) {
    float f = 0.0;
    float a = 0.5;
    for(int i = 0; i < 4; i++) {
      f += a * simplex3d(p);
      p *= 2.0;
      a *= 0.5;
    }
    return f;
  }

  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = mix(vec3(l), mix(vec3(l), vec3(1.0), s), vec3(1.0) - abs(2.0 * l - 1.0));
    return rgb * (1.0 - step(1.0, abs(h - 3.0))) + 
           rgb.zxy * (1.0 - step(1.0, abs(h - 2.0))) * step(1.0, abs(h - 4.0)) +
           rgb.yzx * (1.0 - step(1.0, abs(h - 1.0))) * step(2.0, abs(h - 5.0)) +
           rgb.zxy * (1.0 - step(1.0, abs(h - 4.0))) * step(1.0, abs(h - 2.0)) +
           rgb.yzx * (1.0 - step(1.0, abs(h - 5.0))) * step(1.0, abs(h - 1.0)) +
           rgb * (1.0 - step(1.0, abs(h - 6.0))) * step(1.0, abs(h - 0.0));
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;
    
    // Create flowing nebula
    vec3 pos = vec3(uv * 0.5, uTime * 0.1);
    float noise1 = fbm(pos);
    float noise2 = fbm(pos * 2.0 + vec3(100.0));
    
    // Combine noises for nebula effect
    float nebula = (noise1 + noise2 * 0.5) * 0.5 + 0.5;
    nebula = pow(nebula, 2.0);
    
    // Add swirling motion
    float angle = atan(uv.y, uv.x) + uTime * 0.2;
    float radius = length(uv);
    float spiral = sin(angle * 3.0 + radius * 8.0 - uTime) * 0.5 + 0.5;
    
    nebula = mix(nebula, spiral, 0.3);
    
    // Convert hue to HSL color
    float hue = uHue / 360.0 * 6.0;
    vec3 color = hsl2rgb(hue, 0.8, nebula * 0.6);
    
    // Add some sparkles
    float sparkle = step(0.98, simplex3d(vec3(uv * 50.0, uTime * 2.0)));
    color += sparkle * 0.5;
    
    // Fade edges
    float vignette = 1.0 - length(uv * 0.7);
    vignette = smoothstep(0.0, 1.0, vignette);
    
    color *= vignette;
    color *= nebula;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function NebulaCanvas() {
  const canvasRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const materialRef = useRef();
  const animationRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get user preferences
    const prefs = JSON.parse(localStorage.getItem("phantomui_preferences") || "{}");
    const primaryColor = prefs.primaryColor || 240; // Default to blue

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHue: { value: primaryColor },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader,
      fragmentShader
    });

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    materialRef.current = material;

    // Animation loop
    function animate(time) {
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = time * 0.001;
      }
      
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    animate(0);

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      renderer.setSize(width, height);
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: '#000'
      }}
    />
  );
}
