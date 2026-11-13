// A living sea and sky, painted in one fragment shader. uDay scrubs dawn (0) → noon (1) → golden hour (2) → night (3).
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uDay, uHorizon; uniform vec2 uMouse;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(7.1,3.7); a*=.5; } return s; }
vec3 key(vec3 a, vec3 b, vec3 c, vec3 d){
  float t = clamp(uDay,0.,3.);
  vec3 r = mix(a,b,smoothstep(0.,1.,t));
  r = mix(r,c,smoothstep(1.,2.,t));
  return mix(r,d,smoothstep(2.,3.,t));
}
float key1(float a,float b,float c,float d){ return key(vec3(a),vec3(b),vec3(c),vec3(d)).x; }

// everything above the waterline. p.x 0..1, e = elevation above horizon (0..)
vec3 sky(vec2 p, float e, float asp, float landOn){
  vec3 top = key(vec3(.13,.17,.36), vec3(.16,.42,.74), vec3(.12,.13,.30), vec3(.012,.016,.045));
  vec3 mid = key(vec3(.78,.52,.55), vec3(.55,.76,.92), vec3(.86,.38,.36), vec3(.05,.07,.16));
  vec3 hor = key(vec3(1.,.76,.58), vec3(.86,.94,.98), vec3(1.,.66,.32), vec3(.10,.13,.26));
  vec3 c = mix(hor, mid, smoothstep(0.,.22,e));
  c = mix(c, top, smoothstep(.12,.75,e));
  // sun
  vec2 sun = vec2(key1(.30,.52,.80,.9) + uMouse.x*.012, key1(.035,.62,.07,-.25));
  vec2 d = vec2((p.x-sun.x)*asp, e-sun.y);
  float r = length(d);
  vec3 sunCol = key(vec3(1.,.82,.66), vec3(1.,.98,.92), vec3(1.,.74,.42), vec3(0.));
  float night = smoothstep(2.3,3.,uDay);
  c += sunCol * (smoothstep(.034,.03,r) * 1.2 + exp(-r*9.)*.55 + exp(-r*2.6)*.28) * (1.-night);
  // moon + stars
  vec2 md = vec2((p.x-.74)*asp, e-.5);
  float mr = length(md);
  c += vec3(.95,.93,.86) * (smoothstep(.026,.023,mr) + exp(-mr*11.)*.22) * night;
  vec2 sp = vec2(p.x*asp, e)*150.;
  vec2 sc = floor(sp); float sh = hash(sc);
  float st = step(.985, sh) * smoothstep(.16+.2*fract(sh*71.), 0., length(fract(sp)-.5)) * (.6+.4*sin(uTime*1.7+sh*400.));
  c += vec3(st) * night * smoothstep(.02,.3,e);
  // high cloud streaks, lit from the horizon
  float cl = fbm(vec2(p.x*asp*1.5 + uTime*.006, e*9.) + 3.);
  cl = smoothstep(.52,.86,cl) * smoothstep(.02,.16,e) * smoothstep(.62,.2,e);
  vec3 clCol = key(vec3(1.,.72,.66), vec3(1.), vec3(1.,.55,.4), vec3(.14,.17,.3));
  c = mix(c, clCol, cl*.5);
  // far headlands sitting on the horizon
  float ridgeL = (fbm(vec2(p.x*5.5, 1.3))*.11 - .012) * smoothstep(.42,.0,p.x);
  float ridgeR = (fbm(vec2(p.x*7.+9., 4.1))*.07 - .012) * smoothstep(.72,1.,p.x);
  float ridge = max(ridgeL, ridgeR);
  vec3 land = mix(hor, key(vec3(.25,.2,.32), vec3(.3,.45,.55), vec3(.26,.13,.2), vec3(.015,.02,.05)), .78);
  c = mix(c, land, smoothstep(ridge+.003, ridge-.001, e) * smoothstep(0., .004, ridge) * landOn);
  return c;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float h = uHorizon;
  vec3 col;
  if (uv.y >= h) {
    col = sky(uv, (uv.y-h), asp, 1.);
  } else {
    float d = (h-uv.y)/h;                 // 0 at horizon → 1 at the bottom edge
    float z = 1./(d*1.6+.035);            // fake perspective
    vec2 w = vec2((uv.x-.5)*asp*z*.9, z*1.6);
    float t = uTime*.22;
    float n = fbm(w*vec2(1.3,3.2)+vec2(t*.6,t)) - .5;
    float n2 = noise(w*vec2(5.,16.)+vec2(-t*1.4,t*2.3)) - .5;
    float rip = (n*.05 + n2*.012) * (.25 + d*1.9);
    vec3 refl = sky(vec2(uv.x + rip*.5, 0.), (h-uv.y)*1.02 + rip + .002, asp, 1.);
    vec3 deep = key(vec3(.06,.09,.18), vec3(.02,.2,.3), vec3(.07,.06,.14), vec3(.004,.008,.022));
    float fres = pow(1.-d, 2.4);
    col = mix(deep, refl, .38 + .58*fres);
    // glitter path under the sun / moon
    float sx = mix(key1(.30,.52,.80,.9) + uMouse.x*.012, .74, smoothstep(2.3,3.,uDay));
    float path = exp(-abs(uv.x-sx)*asp*(5. - d*3.2));
    float glint = pow(max(0., n2+.5), 7.) * path;
    vec3 gcol = key(vec3(1.,.82,.7), vec3(1.), vec3(1.,.72,.42), vec3(.8,.84,1.));
    col += gcol * glint * 1.5 * key1(.9,.55,1.1,.45);
    col = mix(col, sky(uv, .001, asp, 0.), smoothstep(.035,0.,d)*.5); // haze at the horizon line
  }
  // vignette + grain
  vec2 q = uv-.5; col *= 1. - dot(q,q)*.55;
  col += (hash(gl_FragCoord.xy + fract(uTime)*91.) - .5) * .028;
  gl_FragColor = vec4(pow(max(col,0.), vec3(.94)), 1.);
}`;

export function createSea(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'));
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {}; for (const n of ['uRes', 'uTime', 'uDay', 'uHorizon', 'uMouse']) u[n] = gl.getUniformLocation(prog, n);
  const state = { day: 2, horizon: 0.44, mx: 0, my: 0 };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 800 ? 1.25 : 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener('resize', resize); resize();
  return {
    state,
    render(t) {
      resize();
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, t); gl.uniform1f(u.uDay, state.day); gl.uniform1f(u.uHorizon, state.horizon);
      gl.uniform2f(u.uMouse, state.mx, state.my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
