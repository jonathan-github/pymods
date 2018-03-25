/// enable gamma correction w/level
#define GAMMA	2.2

/// enable linear pre-multiplied alpha
#define GAMMA_LINEAR_ALPHA

/// convert from gamma corrected to linear color
vec3 toLinear(vec3 c) {
	return pow(c, vec3(GAMMA));
}
vec4 toLinear(vec4 c) {
#ifdef GAMMA_LINEAR_ALPHA
	return vec4(toLinear(c.rgb / c.a) * c.a, c.a);
#else
	return vec4(toLinear(c.rgb), c.a);
#endif /*GAMMA_LINEAR_ALPHA*/
}

/// convert from linear to gamma corrected color
vec3 toGamma(vec3 c) {
	return pow(c, vec3(1.0 / GAMMA));
}
vec4 toGamma(vec4 c) {
#ifdef GAMMA_LINEAR_ALPHA
	return vec4(toGamma(c.rgb / c.a) * c.a, c.a);
#else
	return vec4(toGamma(c.rgb), c.a);
#endif /*GAMMA_LINEAR_ALPHA*/
}

// For the original ACES curve just multiply input (x) by 0.6.
#define ACESFilm_SCALE  0.6

// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 ACESFilm(vec3 x, float scale) {
	const float a = 2.51;
	const float b = 0.03;
	const float c = 2.43;
	const float d = 0.59;
	const float e = 0.14;
	x *= scale;
	return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
