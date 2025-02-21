import * as React from 'react';
import { Fig01 } from './fig01_geometric_mean';
import { Fig02 } from './fig02_geometric_mean_to_geometric_mean';
import { Fig03 } from './fig03_geometric_mean_to_determinable_geometric_mean';
import { Article } from '../components/article';
import { Footnote } from '../components/footnote';


export function ArchytasArticle(): React.JSX.Element {
    return <Article>
        <h1>A Note on Archytas’s Resolution of the Delian Problem</h1>
        <div className="author">Pavel M. Penev</div>
        <div className="date">July 12, 2009, edited March 1, 2011, February 23, 2023</div>
        <p>
            Since the individual grasp of Architas’ solution to the Delian
            problem can provide evidence for understanding the nature of
            insight, and increasing the ability of other minds to acquire it,
            this is a short account of mine, along with a consideration for
            the thinking that may lead toward such a solution.
        </p>
        <p>
            We would consider, of course, the restatement of the problem of
            doubling a cube as the problem of finding two geometric means
            between two extremes.<Footnote>
                This concept itself requires insight. However, the insight of
                solving the problem of doubling the square, such as by the
                slave boy in Plato's <span className="title">Meno </span>
                dialogue, already points in this direction.</Footnote>
        </p>
        <p>
            Having experienced the relative ease of finding one geometric mean
            by means of a circle with respect to the challange of finding two,
            an epistemological question arises: Whence this
            difference between (dividing a ratio into) two and three (parts)?
            Or, also: How is the three to be known from the two? Considering
            that this question may be viewed easier not in terms of duplicate
            and triplicate ratios (sometimes called square and cube ratios),
            but rather by arithmetic means, we consider how this difference is
            expressed in the difference between bisecting and trisecting a
            given length.
        </p>
        <p>
            We can arrive, more or less directly at a half and at a quarter
            of the length, but not at a third. However, the desired ratio
            (1&nbsp;:&nbsp;3) is expressed when a length is divided into four
            equal parts; namely, between one and three of them. The typical
            solution to finding a third part of the initial length is to,
            then, replicate the ratio between the 1 part and the 3 parts, but
            now both proportionally enlarged in concert until the 3 parts
            coincide with the inital length (the one to be trisected). Then
            the 1 part, enlarged in the same proportion as the 3, had become
            the sought third part of the initial line.
        </p>
        <p>
            Such is the practical solution to this problem, without giving us
            a solution, but only an example, to the wonder of any of the
            causes of the ontological difference between the half and the
            third, such as the difference between coincidence with itself and
            coincidence with another (identity and duplication), as found in
            literature and in geometry.
        </p>
        <p>
            If we shall apply this practical lesson to the matter of
            trisecting a proportion (such as 1&nbsp;:&nbsp;2), we shall
            resort to the literary method of analogy&emdash;with the
            trisection of a length. Were we to start with a ratio between two
            extremes, such as AQ&nbsp;:&nbsp;AO, placing them on top of each
            other, so that they coincide at one end point, we have the known
            construction of the geometric mean AP as a chord in the semicircle
            APO by erecting QP perpendicular to AO in circle with diameter AO.
        </p>
        <div className="figure">
            <Fig01 />
        </div>
        <p>
            Having split the proportion AQ : AO in half, we construct the mark
            dividing the 3 parts (first three quarters) of this proportion from
            its last quarter by splitting the proportion AP&nbsp;:&nbsp;AO by
            means of the same construction: taking AS = AO along the line AP
            and PR as perpendicular to AS, R being on the semicircle ARS. Thus,
            AR&nbsp;:&nbsp;AS is half of the proportion AP&nbsp;:&nbsp;AS, and
            a quarter of the proportion AQ&nbsp;:&nbsp;AO, so that of the four
            parts into which we have split AQ&nbsp;:&nbsp;AO we lack the
            boundary separating the first two, but only have them combined as
            AQ&nbsp;:&nbsp;AP, whereas the third part is AP&nbsp;:&nbsp;AR,
            and the fourth one AR&nbsp;:&nbsp;AS.<Footnote>
                And, if this should provoke us to ask what the boundary of a
                proportion expressed between lengths is, it should, of course,
                be answered, in accord with our analogy, that whereas the
                boundaries of lengths are expressed points, those of
                proportions between lengths are expressed as lines in our
                case.</Footnote>
            {' '}Thus, AQ&nbsp;:&nbsp;AR is the triplicate of the proportion
            AP&nbsp;:&nbsp;AR = AR&nbsp;:&nbsp;AS.
        </p>
        <Fig02 />
        <p>
            Our analogy now leads us to reduce AQ until the lacking boundary
            would coincide with the first of our extremes, while AP would be
            proportionally reduced to the first of our means, AR to the second
            one, AS = AO remaining the second extreme all the while (AQ
            becoming smaller than the first extreme the way in the analogous
            problem the first endpoint of the line divided in 4 goes outside
            the line to be trisected).
        </p>
        <p>
            If concerns are now arising over how we are to carry this
            construction out, since this process of enlarging the proportional
            distance between AQ and AO is to stop when our first extreme
            coincides with a phantom boundary, let the purpose of concerns be
            not to suppress us, but to provide our free will with a struggle
            that can lead us to ingenuity, remembering that the insight to
            overcome challenges is what we can leave to others even after our
            time has passed.
        </p>
        <p>
            We can then see that, since we are required to proportionally
            enlarge proportions, and that until a definite proportion is
            reached between each of these proportions and its triplicate, the
            true boundary of the process of enlargement is not a line, an
            extreme, but rather only a proportion between lines, regardless of
            their specific size. Thus, if it be required for the proportion
            between the two extremes to be 1&nbsp;:&nbsp;2 (to double the
            cube), it is simply required to stop the process of enlargement at
            the point any of the proportions has a triplicate which is
            1&nbsp;:&nbsp;2. Therefore, we can stop the process of shrinking
            AQ when AQ&nbsp;:&nbsp;AR (the triplicate of
            AP&nbsp;:&nbsp;AR = AR&nbsp;:&nbsp;AS) becomes 1&nbsp;:&nbsp;2.
        </p>
        <p>
            Our construction has now become the following. We would like to
            rotate circle ARS around point A, generating different points P,
            and having a perpendicular to AS from P always generate the
            corresponding location of point R (on circle ARS) for the
            different positions of P. We would like to stop that process when
            AQ&nbsp;:&nbsp;AR becomes 1&nbsp;:&nbsp;2. Then, if AS is twice
            the edge of the inital cube, AP will be the edge of its double, AR
            of its quadruple, etc.
        </p>
        <p>
            How might we physically construct this? Circles, movable points on
            them, as well as lines between given points are easy enough to
            construct. What remains is to construct the means by which to stop
            the motion of P on the circle APO at the moment that
            AQ&nbsp;:&nbsp;AR becomes 1&nbsp;:&nbsp;2. How might we determine
            when two lines of changing length have reached a given proportion?
        </p>
        <p>
            What is common between all possible pairs of lines, such that the
            lines in each pair have the same given proportion between
            themselves? Geometricallly, this is, of course, expressed as a
            triangle with fixed angles. A trangle with the same set of angles,
            and proportions between the sides can be formed by moving one of
            its sides so it stays parallel to itself.
        </p>
        <p>
            We could use such a construction, if, for example, we could keep
            either angle ARQ or angle AQR constant while P was moving,
            stopping the process when RAQ becomes the angle which corresponds
            to the given proportion 1&nbsp;:&nbsp;2.
        </p>
        <p>
            Could that be done?
        </p>
        <p>
            To execute it, should we, as Gauss did, take our mind off the
            ground, and think not of the traces we have left on the plane, but
            rather of the physical (and mental) processes that had cast them
            there, we may, as Archytas did, erect circle ARS to make its plane
            perpendicular to that of circle APO, the rotation of ARS around
            point A now tracing out half a torus, and the line RP lying on a
            half cylinder, perpendicular to its base APO. We need to stop the
            process of rotating ARS around A when AR becomes twice AQ. In
            other words, when the perpendicular from point R (lying on both
            the torus and the cylinder) to a point Q on AO forms a right
            triangle RQA in which the hypotenuse AR is twice the leg AQ. All
            such possible triangles share the same angle RAQ, so, even if we
            do not know the specific sides of the one we are looking for, if
            we take a line forming the correct angle with AO (60&deg; for
            AR = 2AQ) and, keeping that angle constant, spin the line around
            AO, it would trace all the possible positions for point R to lie
            on, its trace being what we call a cone.
        </p>
        <Fig03 />
        <p className="thought-break">* * *</p>
        <p>
            Thus, we acquire the fruit to nourish our mind. And, like on the
            path form seed to grape, the turmoil has turned into sweetness
            under the light of the sun.
        </p>
    </Article>;
}
