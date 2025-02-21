import { SvgScene } from "../../../src/ts/svg/svg_scene";
import { fig01Scene } from "../../../src/ts/content/fig01_geometric_mean";
import { fig02Scene } from "../../../src/ts/content/fig02_geometric_mean_to_geometric_mean";
import { fig03Scene } from "../../../src/ts/content/fig03_geometric_mean_to_determinable_geometric_mean";
import { figTestCubeScene } from "../test_figures/fig_test_cube";
import { figTestEllipsePlanesScene } from "../test_figures/fig_test_ellipse_planes";
import { figTestEllipticalArcScene } from "../test_figures/fig_test_elliptical_arc";

export interface FigConfig {
    buildScene: () => SvgScene<any>,
    devOutputPath: string
}

export const figureConfigs: Array<FigConfig> = [
    { buildScene: fig01Scene, devOutputPath: 'test/fig01_geometric_mean.svg' },
    { buildScene: fig02Scene, devOutputPath: 'test/fig02_geometric_mean_to_geometric_mean.svg' },
    { buildScene: fig03Scene, devOutputPath: 'test/fig03_geometric_mean_to_determinable_geometric_mean.svg' },
    { buildScene: figTestCubeScene, devOutputPath: 'test/fig_test_cube.svg' },
    { buildScene: figTestEllipticalArcScene, devOutputPath: 'test/fig_test_elliptical_arc.svg' },
    { buildScene: figTestEllipsePlanesScene, devOutputPath: 'test/fig_test_ellipse_planes.svg' },
];
