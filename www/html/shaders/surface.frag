precision mediump float;

uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;

varying vec4 vColor;
varying vec4 vNormal;
  
void main() {
	float weight = max(dot(normalize(vNormal.xyz), uLightDirection), 0.0);
	vec3 light = uAmbientColor + uLightColor * weight;
	gl_FragColor = vec4(vColor.rgb * light, vColor.a);
}
