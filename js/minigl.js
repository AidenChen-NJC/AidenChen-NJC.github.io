/*
 * MiniGL — minimal Stripe-pattern WebGL gradient (~5 KB)
 * Single fullscreen <canvas>, 4 color stops blended via simplex noise.
 * Public API: new MiniGL(canvas, { colors: [hex,hex,hex,hex], speed }).play() / .pause()
 */
(function() {
  'use strict';

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('MiniGL shader err:', gl.getShaderInfoLog(s)); gl.deleteShader(s); return null;
    }
    return s;
  }
  function hex2rgb(h) {
    h = h.replace('#','');
    return [parseInt(h.substr(0,2),16)/255, parseInt(h.substr(2,2),16)/255, parseInt(h.substr(4,2),16)/255];
  }

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
    precision highp float;
    uniform vec2 R; uniform float T, S;
    uniform vec3 C0,C1,C2,C3;
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
    vec3 perm(vec3 x){return mod289(((x*34.)+1.)*x);}
    float sn(vec2 v){
      const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
      vec2 i=floor(v+dot(v,C.yy));
      vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
      vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
      i=mod289(i);
      vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
      vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
      m=m*m; m=m*m;
      vec3 x=2.*fract(p*C.www)-1.; vec3 h=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;
      m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
      vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.*dot(m,g);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/R.xy; uv.x*=R.x/R.y;
      float t=T*0.0001*S;
      float n1=sn(uv*0.7+vec2(t*0.5,t*0.3));
      float n2=sn(uv*1.1+vec2(-t*0.4,t*0.6));
      float n3=sn(uv*0.5+vec2(t*0.2,-t*0.4));
      vec3 a=mix(C0,C1,smoothstep(-.7,.7,n1));
      vec3 b=mix(C2,C3,smoothstep(-.7,.7,n2));
      vec3 final=mix(a,b,smoothstep(-.5,.5,n3)*0.35);
      gl_FragColor=vec4(final,1.0);
    }`;

  class MiniGL {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.colors = (opts && opts.colors || ['#08070A','#0E0B12','#5C1A1B','#08070A']).map(hex2rgb);
      this.speed = (opts && opts.speed) || 0.5;
      this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!this.gl) { this.unsupported = true; return; }
      this._init();
    }
    _init() {
      const gl = this.gl;
      const vs = compile(gl, gl.VERTEX_SHADER, VS);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) { this.unsupported = true; return; }
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { this.unsupported = true; return; }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      this.uR = gl.getUniformLocation(prog, 'R');
      this.uT = gl.getUniformLocation(prog, 'T');
      this.uS = gl.getUniformLocation(prog, 'S');
      const u = ['C0','C1','C2','C3'].map(n => gl.getUniformLocation(prog, n));
      gl.uniform1f(this.uS, this.speed);
      this.colors.forEach((c, i) => gl.uniform3fv(u[i], c));
      this._resize();
      this._onResize = () => this._resize();
      window.addEventListener('resize', this._onResize);
      this.t0 = performance.now();
      this.running = false;
    }
    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.floor(window.innerWidth * dpr);
      this.canvas.height = Math.floor(window.innerHeight * dpr);
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.uR, this.canvas.width, this.canvas.height);
    }
    play() {
      if (this.unsupported || this.running) return;
      this.running = true;
      const tick = () => {
        if (!this.running) return;
        this.gl.uniform1f(this.uT, performance.now() - this.t0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }
    pause() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
    }
  }

  window.MiniGL = MiniGL;
})();
