library( sparsepca ) # for sparse PCA / SVD

number_of_harmonics = 128
harmonics = 1:number_of_harmonics

#
# The fourier series of a function d is:
# f(x) = sum_n a_n sin(nx)/n + b_n cos(nx)/n
# Its derivative is
# f'(x) = sum_i a_n cos(nx) - b_n sin(nx)
#

# We use a slightly generalised version below that include fixed weights w_n on the terms, so
# f(x) = sum_n a_n sin(nx) * w_n/n + b_n cos(nx) * w_n/n
# This is a simple way to prefer lower harmonics when we solve for coefficients.
# E.g. if we set the weights to 1/2^(n-1) then a gradient of 1 at x=0 will be obtained by any of:
# a_1 = 1, a_2 = 2, a_3 = 4, and so on.

# fterms()
# Given coefficients (a_n), (b_n) this function computes the terms in the fourier series, as above.
# a_n terms come first in the coeffs vector, then b_n terms.
# The same weights is applied to sin and cosine terms.
fterms = function(
	x,
	coeffs,
	weights = 0.5^(0:(L-1))
) {
	L = length(coeffs)/2
	# ith harmonic is given amplitude 1/i, so has same gradient at 0
	c(
		(weights * coeffs[1:L] * sin(x*(1:L)) / 1:L),
		(weights * coeffs[L+(1:L)] * cos(x*(1:L)) / 1:L )
	)
}

# dfterms()
# Given coefficients (a_n), (b_n) this function computes the terms in the derivative of the fourier series.
# a_n terms come first in the coeffs vector, then b_n terms.
# The same weights is applied to sin and cosine terms.
dfterms = function(
	x,
	coeffs,
	weights = 0.5^(0:(L-1))
) {
	L = length(coeffs)/2
	# ith harmonic is given amplitude 1/i, so has same gradient at 0
	c(
		(weights * coeffs[1:L] * cos(x*(1:L)) ),
		(-weights * coeffs[L+(1:L)] * sin(x*(1:L)) )
	)
}

# f()
# Add up the fourier series to compute the function
f = function(x, coeffs, weights = 0.5^(0:(L-1)) ) {
	sapply(
		x,
		function(x) {
			sum( fterms( x, coeffs, weights ))
		}
	)
}

# df()
# Add up the derivative of the fourier series to compute the derivative of the function
df = function(x, coeffs, weights = 0.5^(0:(L-1)) ) {
	sapply(
		x,
		function(x) {
			sum( dfterms( x, coeffs, weights ))
		}
	)
}

# plot.it()
# This function plots the function f and its derivative, annotating specific points.
plot.it <- function( coeffs, crossing.points = NULL, weights = weights ) {
	xs = seq( from = 0, to = 2*pi, by = 0.01 )
	ylim = c(
		min(-1, min( f( xs, coeffs, weights ) * 1.05 )),
		max(1, max( f( xs, coeffs, weights ) * 1.05 ))
	)

	plot( xs, f( xs, coeffs, weights ), type = 'l', lwd = 5, bty = 'n', ylim = ylim, xaxt = 'n', xlab = '' )
	axis( 1, at = seq( from = 0, to = 2*pi, by = pi/4 ), labels = c( '0', 'pi/4', 'pi/2', '3pi/4', 'pi', '5pi/4', '6pi/4', '7pi/4', '2pi'))
	mtext( 'x', side = 1, line = 3, cex = 2 )
	abline( h = seq( from = floor( min( ylim )), to = ceiling( max( ylim )), by = 0.5 ), lty = 1, col = rgb( 0, 0, 0, 0.2 ), lwd = 1 )
	abline( h = seq( from = floor( min( ylim )), to = ceiling( max( ylim )), by = 1 ), lty = 1, col = rgb( 0, 0, 0, 0.2 ), lwd = 2 )
	abline( v = 2*pi*(0:7)/8, lty = 1, col = rgb( 0, 0, 0, 0.2 ), lwd = 1 )
	abline( v = 2*pi*(0:3)/4, lty = 1, col = rgb( 0, 0, 0, 0.2 ), lwd = 2 )
	points( xs, df( xs, coeffs, weights ), type = 'l', lwd = 1, lty = 2 )
	legend(
		"topright",
		legend = c( "f", "df" ),
		lty = c( 1, 2 ),
		lwd = c( 5, 2 ),
		bty = 'n'
	)
	if( !is.null( points )) {
		points(
			crossing.points[,1],
			crossing.points[,2],
			col = 'red'
		)
		points(
			crossing.points[,1],
			rep(0, nrow(crossing.points)),
			col = 'red'
		)
	}
}

# find.fourier.series()
# Given a set of points where f should cross the x axis, with gradients,
# this function computes a fourier series that has these crossing points.
# Specifically it computes the series with the 'smallest' coefficient vector (in the sense
# of Euclidean distance to the origin).  If weights are given then they can affect which solution is
# found (because, in effect, they stretch out the coefficient dimensions so affecting which are closest to the origin).
# The function works by representing the crossing points as linear equations the coefficients must satisfy,
# and solving using the pseudoinverse.
find.fourier.series = function( crossing.points, number_of_harmonics, weights ) {
	# We will write constrians as Ax = b and we need to solve for x.
	A = matrix(
		NA,
		nrow = 2*nrow(crossing.points),
		ncol = 2*number_of_harmonics,
		byrow = T
	)
	L = number_of_harmonics
	for( i in 1:nrow( crossing.points )) {
		# Curve passes through zero so encode value of the harmonic comonents at the point
		A[2*i-1,] = fterms( crossing.points[i,1], rep( 1, L*2 ), weights )
		A[2*i,] = dfterms( crossing.points[i,1], rep( 1, L*2 ), weights )
	}

	S = svd(A)
	# Now A = U D V^t, i.e.
	stopifnot( max( A - (S$u %*% diag(S$d) %*% t(S$v)) ) < 1E-12 )

	# and
	# and pseudoinverse is
	# A^+ = V D^+ U^t

	# Solve for minimum 2-norm solution A x = b
	pseudoinverse = S$v %*% diag( 1/S$d ) %*% t(S$u )
	n = nrow(crossing.points)
	# Kludge as we need b in Ax=b to be interspersed 0 (crosses at zero) and gradients.
	select = c( 1, n+1, 2, n+2, 3, n+3, 4, n+4, 5, n+5, 6, n+6, 7, n+7, 8, n+8, 9, n+9, 10, n+10)
	b = c( rep( 0, n ), crossing.points[,2] )[ select[1:(n*2)]]
	z_0 = pseudoinverse %*% b
	return(z_0)
}

# Points in interval of length P = 2pi


twopi = 2*pi
rhythms = list(
	door = list(
		name = "There's somebody at the door",
		data = as.matrix(
			 tibble::tribble(
				~x,                 ~dx,
				# Some-
				0      * twopi / 4,   1,
				# bo-
				1/3 * twopi / 4, 0.4,
				# dy
				2/3 * twopi / 4, 0.5,
				# at
				1      * twopi / 4, 0.9,
				# the
				5/3 * twopi / 4, 0.8,
				# door.
				2      * twopi / 4,   1,
				# There's
				11/3 * twopi / 4, 0.3
			)
		)
	),
	mario = list(
		name = "1st bar of Mario",
		data = as.matrix(
			tibble::tibble(
				x = c(
		#			(2*pi)/16 * c(0,3,6,10,12)
		#			(2*pi)/16 * c(2,4,8,11,14)
		#			(2*pi)/16 * c( 2, 5, 8, 11, 14 )
		#			(2*pi)/16 * c( 0, 3, 6, 10, 13 )
					((2*pi)/16) * c( 0, 3, 6, 9, 11, 13, 14 )
				),
				dx = c( 1, 0.75, 0.75, 0.75, 1, 0.75, 0.75 )
			)
		)
	)
)

rhythms$door2 = rhythms$door
rhythms$door2$data[7,1] = 3 * twopi / 4
rhythms$door2$name = "There's somebody at the door (simple)"

crossing.points = rhythms[['mario']]

# I'll weight by powers of 4
weights = 0.5^(seq( from = 0, to = (number_of_harmonics-1)*2, by = 2 ))

# Solve for the fourier coefficients
z_0 = find.fourier.series( crossing.points$data, number_of_harmonics, weights = weights )

# Plot the solution
plot.it( z_0, crossing.points$data, weights = weights )
mtext( crossing.points$name, 3, line = 1, cex = 2 )

# Print the top few parameters
print( tibble::tibble(
	harmonic = 1:number_of_harmonics,
	sin = sprintf( "%.4f", z_0[1:number_of_harmonics]*weights ),
	cos = sprintf( "%.4f", z_0[number_of_harmonics+(1:number_of_harmonics)]*weights )
), n = 16 )
