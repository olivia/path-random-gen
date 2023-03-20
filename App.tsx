import * as React from 'react';
import './style.css';

const [height, width, dx, dy] = [240, 400, 20, 20];
const [minx, maxx, miny, maxy] = [0, width / dx, 0, height / dy];

const randIdx = () =>
  Math.round(Math.random() * (-1 + (height * width) / (dx * dy)));

const idxToXY = (idx) => {
  const cols = width / dx;
  return [idx % cols, Math.floor(idx / cols)];
};

const xyToIdx = ([x, y]) => {
  const cols = width / dx;
  return y * cols + x;
};

const xyToCart = ([x, y]) => {
  return [(x + 0.5) * dx, (y + 0.5) * dy];
};

const randomUniqArr = (n, randGen) => {
  const res = [];
  let maxiters = 1000;
  while (n && maxiters >= 0) {
    let r;
    try {
      r = randGen(res[res.length - 1], res);
      if (res.indexOf(r) === -1) {
        res.push(r);
        n--;
      } else {
        throw new Error('dupe found ' + r);
      }
    } catch (e) {
      console.error(e);
      res.pop();
      n++;
      maxiters--;
    }
  }
  if (maxiters < 0) {
    console.log('exhausted rand function');
  }
  return res;
};

const ShapePath = (props) => {
  return (
    <polyline
      points={props.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
      fill="none"
      stroke={props.color}
    />
  );
};

const pointIsOnLine = (p, [l1s, l1e]) => {
  const [[px, py], [x1, y1], [x2, y2]] = [p, l1s, l1e].map(idxToXY);

  if (x1 === x2) {
    // vertical
    return px === x1 && Math.min(y1, y2) <= py && py <= Math.max(y1, y2);
  } else if (y1 === y2) {
    // horizontal
    return py === y1 && Math.min(x1, x2) <= px && px <= Math.max(x1, x2);
  } else {
    const t1 = (px - x1) / (x2 - x1);
    const t2 = (py - y1) / (y2 - y1);
    return t1 === t2 && t1 <= 1 && 0 <= t1;
  }
};

const lineIdxIntersects = ([l1s, l1e], [l2s, l2e]) => {
  const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = [l1s, l1e, l2s, l2e].map(
    idxToXY
  );
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  // parallel or coincident
  if (denominator === 0) {
    return pointIsOnLine(l2s, [l1s, l1e]) || pointIsOnLine(l2e, [l1s, l1e]);
  }
  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
    denominator;
  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
    denominator;

  return (
    Math.min(x1, x2) <= px &&
    Math.max(x1, x2) >= px &&
    Math.min(y1, y2) <= py &&
    Math.max(y1, y2) >= py
  );
};

const isParallel = ([l1s, l1e], [l2s, l2e]) => {
  const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = [l1s, l1e, l2s, l2e].map(
    idxToXY
  );
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  return denominator === 0;
};

const randomWalk = ({ index, maxStep, dhRatio }) => {
  const [isDiagonal, dir, magnitude] = [
    Math.random() < dhRatio,
    Math.round(Math.random() * 3),
    1 + Math.round(Math.random() * (maxStep - 1)),
  ];
  let offset;
  if (isDiagonal) {
    const offsets = [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ].map(([x, y]) => [x * magnitude, y * magnitude]);
    offset = offsets[dir];
  } else {
    const offsets = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ].map(([x, y]) => [x * magnitude, y * magnitude]);
    offset = offsets[dir];
  }
  const oldXY = idxToXY(index);
  let newXY = [
    Math.min(maxx - 1, Math.max(minx, oldXY[0] + offset[0])),
    Math.min(maxy - 1, Math.max(miny, oldXY[1] + offset[1])),
  ];

  if (isDiagonal) {
    const maxMagnitude = Math.min(
      Math.abs(newXY[0] - oldXY[0]),
      Math.abs(newXY[1] - oldXY[1])
    );
    newXY = [
      oldXY[0] + (maxMagnitude * offset[0]) / Math.abs(offset[0]),
      oldXY[1] + (maxMagnitude * offset[1]) / Math.abs(offset[1]),
    ];
  }

  return xyToIdx(newXY as [number, number]);
};

const getLineArr = (prevPoints) => {
  const lines = [];
  prevPoints.forEach((p, i, arr) => {
    if (i < arr.length - 1) {
      lines.push([p, arr[i + 1]]);
    }
  });
  return lines;
};

// if can insert
const canInsert = (l1s, prevPoints) => {
  if (prevPoints.length >= 2) {
    let found = 0;
    const lines = getLineArr(prevPoints);
    if (
      isParallel(
        [l1s, prevPoints[prevPoints.length - 1]],
        lines[lines.length - 1]
      )
    ) {
      return false;
    }

    for (const l of lines.slice(0, -1)) {
      if (lineIdxIntersects([l1s, prevPoints[prevPoints.length - 1]], l)) {
        return false;
      }
    }
  }
  return true;
};

export default function App() {
  const [a, sa] = React.useState(0);
  const [dhRatio, setDHRatio] = React.useState(0.5);
  const [maxStep, setMaxStep] = React.useState(10);
  const [shapeNum, setShapeNum] = React.useState(3);

  const randArr = randomUniqArr(shapeNum * 3, (prev, prevPoints) => {
    if (prev === undefined) {
      return randIdx();
    } else {
      let iterations = 0;
      let found = false;
      while (iterations <= 1000) {
        const p = randomWalk({ index: prev, maxStep, dhRatio });
        if (canInsert(p, prevPoints)) {
          return p;
        }
        iterations++;
      }
      throw new Error('Exhausted iterations');
    }
  }).map(idxToXY);

  const hgrid = Array(height / dy)
    .fill(0)
    .map((_, i) => `M0 ${i * dy} L${width} ${i * dy}`)
    .join(' ');
  const vgrid = Array(width / dx)
    .fill(0)
    .map((_, i) => `M${i * dx} 0 L${i * dx} ${height}`)
    .join(' ');

  const pathLines = ['red', 'green', 'blue'].map((color, i) => {
    return (
      <ShapePath
        color={color}
        points={randArr
          .slice(shapeNum * i, shapeNum * (i + 1))
          .map((s) => xyToCart(s as [number, number]))}
      />
    );
  });

  const circles = (
    <React.Fragment>
      {randArr.slice(shapeNum * 0, shapeNum * 1).map(([randx, randy], i) => {
        return (
          <React.Fragment>
            <circle
              cx={dx * 0.5 + dx * randx}
              cy={dy * 0.5 + dy * randy}
              fill="red"
              r={dx / 3}
            />
            <text x={dx * 0.25 + dx * randx} y={dy * 0.75 + dy * randy}>
              {i}
            </text>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
  const diamond = randArr
    .slice(shapeNum * 1, shapeNum * 2)
    .map(([randx, randy], i) => {
      return (
        <React.Fragment>
          <polygon
            points={`${-dx / 3 + dx * 0.5 + dx * randx}, ${
              dy / 3 + dy * 0.5 + dy * randy
            } ${-dx / 3 + dx * 0.5 + dx * randx}, ${
              -dy / 3 + dy * 0.5 + dy * randy
            } ${dx / 3 + dx * 0.5 + dx * randx}, ${
              -dy / 3 + dy * 0.5 + dy * randy
            } ${dx / 3 + dx * 0.5 + dx * randx}, ${
              dy / 3 + dy * 0.5 + dy * randy
            }`}
            fill="green"
            r={dx / 3}
          />{' '}
          <text x={dx * 0.25 + dx * randx} y={dy * 0.75 + dy * randy}>
            {i}
          </text>
        </React.Fragment>
      );
    });
  const triangle = randArr
    .slice(shapeNum * 2, shapeNum * 3)
    .map(([randx, randy], i) => {
      return (
        <React.Fragment>
          <polygon
            points={`${-dx / 3 + dx * 0.5 + dx * randx}, ${
              dy / 3 + dy * 0.5 + dy * randy
            } ${dx * 0.5 + dx * randx}, ${-dy / 3 + dy * 0.5 + dy * randy} ${
              dx / 3 + dx * 0.5 + dx * randx
            }, ${dy / 3 + dy * 0.5 + dy * randy}`}
            fill="blue"
            r={dx / 3}
          />{' '}
          <text x={dx * 0.25 + dx * randx} y={dy * 0.75 + dy * randy}>
            {i}
          </text>
        </React.Fragment>
      );
    });

  return (
    <div>
      <svg width="400" height="240" style={{ background: 'grey' }}>
        <path d={hgrid} stroke="white" />
        <path d={vgrid} stroke="white" />
        {circles}
        {triangle}
        {diamond}
        {pathLines}
      </svg>
      <div>
        <button onClick={() => sa(a + 1)}>Refresh</button>
      </div>
      <div>
        <label>
          ShapeNum = {shapeNum}
          <input
            value={shapeNum}
            onChange={(a) => setShapeNum(+a.target.value)}
            min="0"
            max="15"
            step="1"
            type="range"
          />
        </label>
      </div>
      <div>
        <label>
          DH Ratio = {dhRatio}
          <input
            value={dhRatio}
            onChange={(a) => setDHRatio(+a.target.value)}
            min="0"
            max="1"
            step="0.1"
            type="range"
          />
        </label>
      </div>
      <div>
        <label>
          Max Step = {maxStep}
          <input
            value={maxStep}
            onChange={(a) => setMaxStep(+a.target.value)}
            min="0"
            max={maxx}
            step="1"
            type="range"
          />
        </label>
      </div>
    </div>
  );
}
