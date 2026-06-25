import * as ClipperLib from 'clipper-lib';
import { calculateRidgeLine, calculatePolygonCenter } from './polygonUtils';

export const calculateStraightSkeleton = (screenPts: { x: number, y: number }[], shape: string = 'gable') => {
    if (screenPts.length < 3 || shape === 'flat') return { lines: [], nodes: [] };

    const rawLines: Array<{ start: { x: number, y: number }, end: { x: number, y: number }, type: 'ridge' | 'valley' | 'hip' }> = [];

    const scale = 1000;
    const path = screenPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }));

    const isPositive = ClipperLib.Clipper.Orientation(path);
    if (!isPositive) {
        path.reverse();
    }

    // A true straight skeleton is hard to compute precisely with ClipperOffset without getting 
    // too many artifacts. To keep the UI clean (no overlapping points/lines), we will use
    // to a minimal offset approach focusing ONLY on the major events:
    // 1. Shrink by a large step to find the 'center' or 'spine' of the polygon.
    // 2. We don't save intermediate loops unless it splits.

    let currentPaths = [path];
    const step = 8 * scale; // larger step to reduce node count
    let iteration = 0;
    const maxIterations = 200;

    const co = new ClipperLib.ClipperOffset();

    // We only want to save the original perimeter and the very final "spine" paths.
    // Plus any essential "split" events.
    const keyPaths: { X: number, Y: number }[][] = [];
    const hipLines: typeof rawLines = [];

    let lastPaths = [...currentPaths];

    while (currentPaths.length > 0 && iteration < maxIterations) {
        iteration++;
        co.Clear();
        co.AddPaths(currentPaths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);

        const offsetPaths = new ClipperLib.Paths();
        co.Execute(offsetPaths, -step);

        if (offsetPaths.length === 0) {
            // Reached the center. The last valid paths are our "spines".
            lastPaths.forEach(p => keyPaths.push([...p]));
            break;
        }

        // If the polygon splits, save the paths just BEFORE the split as spines, 
        // and the paths AFTER the split to continue tracking.
        if (offsetPaths.length > currentPaths.length) {
            lastPaths.forEach(p => keyPaths.push([...p]));
        }

        // Connect original corners inward. For simplicity, we just connect the original screenPts 
        // to their closest points on the final spines later. 
        // But for concave shapes, valleys need to follow the inner corners.
        // We track hips/valleys dynamically:
        offsetPaths.forEach(newPath => {
            currentPaths.forEach(prevPath => {
                prevPath.forEach(prevV => {
                    let closestDist = Infinity;
                    let closestNewV = newPath[0];
                    newPath.forEach(newV => {
                        const d = Math.hypot(newV.X - prevV.X, newV.Y - prevV.Y);
                        if (d < closestDist) {
                            closestDist = d;
                            closestNewV = newV;
                        }
                    });

                    // Only add hip/valley lines if it's a significant corner movement
                    if (closestDist > 0.1 * scale && closestDist <= step * 2) {
                        hipLines.push({
                            start: { x: prevV.X / scale, y: prevV.Y / scale },
                            end: { x: closestNewV.X / scale, y: closestNewV.Y / scale },
                            type: 'hip' // can refine to valley later
                        });
                    }
                });
            });
        });

        lastPaths = offsetPaths;
        currentPaths = offsetPaths;
    }

    // Add exactly the spines as ridges
    keyPaths.forEach(p => {
        if (p.length >= 2) {
            for (let i = 0; i < p.length - 1; i++) {
                rawLines.push({
                    start: { x: p[i].X / scale, y: p[i].Y / scale },
                    end: { x: p[i + 1].X / scale, y: p[i + 1].Y / scale },
                    type: 'ridge'
                });
            }
            if (p.length > 2) {
                rawLines.push({
                    start: { x: p[p.length - 1].X / scale, y: p[p.length - 1].Y / scale },
                    end: { x: p[0].X / scale, y: p[0].Y / scale },
                    type: 'ridge'
                });
            }
        }
    });

    // Add all tracked hips
    rawLines.push(...hipLines);

    // --- Post-process: Snap Points and Merge Collinear Segments ---
    // We aggressively simplify this graph so we don't end up with hundreds of segments.
    const snapPts: { x: number, y: number }[] = [];
    const snapTol = 15; // Aggressive snapping

    const getSnappedPoint = (pt: { x: number, y: number }) => {
        for (const p of screenPts) {
            if (Math.hypot(p.x - pt.x, p.y - pt.y) < snapTol) return p;
        }
        for (const sp of snapPts) {
            if (Math.hypot(sp.x - pt.x, sp.y - pt.y) < snapTol) return sp;
        }
        snapPts.push(pt);
        return pt;
    };

    let snappedLines = rawLines.map(l => ({
        start: getSnappedPoint(l.start),
        end: getSnappedPoint(l.end),
        type: l.type
    })).filter(l => l.start !== l.end);

    // Filter duplicate lines
    const uniqueLines: typeof snappedLines = [];
    snappedLines.forEach(l => {
        const isDup = uniqueLines.some(ul =>
            (ul.start === l.start && ul.end === l.end) ||
            (ul.start === l.end && ul.end === l.start)
        );
        if (!isDup) uniqueLines.push(l);
    });

    let simplifiedLines = [...uniqueLines];
    let changed = true;
    const angTol = 0.5; // roughly 28 degrees allowance for collinear merge of intermediate nodes

    while (changed) {
        changed = false;

        const adj = new Map<any, { line: any, other: any }[]>();
        screenPts.forEach(p => adj.set(p, []));
        snapPts.forEach(p => adj.set(p, []));

        simplifiedLines.forEach(l => {
            if (!adj.has(l.start)) adj.set(l.start, []);
            if (!adj.has(l.end)) adj.set(l.end, []);
            adj.get(l.start)!.push({ line: l, other: l.end });
            adj.get(l.end)!.push({ line: l, other: l.start });
        });

        for (const [node, edges] of adj.entries()) {
            // Only merge if it's an internal node with exactly 2 edges
            if (edges.length === 2 && !screenPts.includes(node)) {
                const e1 = edges[0];
                const e2 = edges[1];

                const pB = node;
                const pA = e1.other;
                const pC = e2.other;

                const angle1 = Math.atan2(pB.y - pA.y, pB.x - pA.x);
                const angle2 = Math.atan2(pC.y - pB.y, pC.x - pB.x);

                let diff = Math.abs(angle1 - angle2);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;

                if (diff < angTol || diff > 2 * Math.PI - angTol) {
                    simplifiedLines = simplifiedLines.filter(l => l !== e1.line && l !== e2.line);
                    simplifiedLines.push({
                        start: pA,
                        end: pC,
                        type: e1.line.type === 'ridge' || e2.line.type === 'ridge' ? 'ridge' : 'hip'
                    });
                    changed = true;
                    break;
                }
            }
        }
    }

    // Output graph inner nodes
    const nodeSetObj = new Set<any>();
    simplifiedLines.forEach(l => {
        nodeSetObj.add(l.start);
        nodeSetObj.add(l.end);
    });

    const internalNodes: { x: number, y: number }[] = [];
    nodeSetObj.forEach(n => {
        const onPerimeter = screenPts.some(pt => Math.hypot(pt.x - n.x, pt.y - n.y) < 2);
        if (!onPerimeter) {
            internalNodes.push(n);
        }
    });

    return { lines: simplifiedLines, nodes: internalNodes };
};

export const calculateRoofStructureLines = (screenPts: { x: number, y: number }[], shape?: string, ridgeAngle?: number, ridgeDirection?: number, isAnalyzed?: boolean, skeletonNodeOverrides?: Record<number, { x: number, y: number }>, deletedNodes?: number[], addedNodes?: { x: number, y: number }[]) => {
    if (screenPts.length < 3) return { lines: [], nodes: [], faces: [] as { vertices: { x: number, y: number }[], azimuth: number, tilt: number }[] };

    // If auto-split roof is triggered, run straight skeleton unconditionally
    if (isAnalyzed) {
        const skeletonData = calculateStraightSkeleton(screenPts, shape || 'gable');
        let finalLines = skeletonData.lines;
        let finalNodes = skeletonData.nodes;

        if (addedNodes && addedNodes.length > 0) {
            addedNodes.forEach((addedNode, addedIndex) => {
                const newIndex = skeletonData.nodes.length + addedIndex;
                if (deletedNodes && deletedNodes.includes(newIndex)) {
                    // Node was deleted by user. Un-split the line by simply not splitting it!
                    // We still push it to finalNodes so the indices of subsequent nodes remain intact.
                    finalNodes.push(addedNode);
                    return;
                }

                // Find nearest line to this added node (within a small tolerance, let's say 2px)
                // Just find the closest line.
                let minSubDist = Infinity;
                let splitLineIdx = -1;

                finalLines.forEach((line, idx) => {
                    const lStart = line.start;
                    const lEnd = line.end;
                    const dx = lEnd.x - lStart.x;
                    const dy = lEnd.y - lStart.y;
                    const len2 = dx * dx + dy * dy;
                    let dist = 0;

                    if (len2 === 0) {
                        dist = Math.hypot(addedNode.x - lStart.x, addedNode.y - lStart.y);
                    } else {
                        const t = Math.max(0, Math.min(1, ((addedNode.x - lStart.x) * dx + (addedNode.y - lStart.y) * dy) / len2));
                        const projX = lStart.x + t * dx;
                        const projY = lStart.y + t * dy;
                        dist = Math.hypot(addedNode.x - projX, addedNode.y - projY);
                    }

                    if (dist < minSubDist && dist < 5) { // 5px snap tolerance
                        minSubDist = dist;
                        splitLineIdx = idx;
                    }
                });

                if (splitLineIdx !== -1) {
                    const lineToSplit = finalLines[splitLineIdx];
                    finalLines.splice(splitLineIdx, 1); // remove original line

                    finalNodes.push(addedNode);
                    const newIndex = finalNodes.length - 1; // It effectively acts as a newly tracked skeleton node

                    finalLines.push({
                        start: lineToSplit.start,
                        end: finalNodes[newIndex],
                        type: lineToSplit.type
                    });
                    finalLines.push({
                        start: finalNodes[newIndex],
                        end: lineToSplit.end,
                        type: lineToSplit.type
                    });
                }
            });
        }

        if (skeletonNodeOverrides) {
            finalNodes = finalNodes.map((n, idx) => {
                const override = skeletonNodeOverrides[idx];
                return override ? { x: override.x, y: override.y } : n;
            });

            finalLines = finalLines.map(line => {
                let s = line.start;
                let e = line.end;

                // Shift ends if they correspond to an inner node
                skeletonData.nodes.forEach((origN, idx) => {
                    if (Math.hypot(origN.x - s.x, origN.y - s.y) < 1) s = finalNodes[idx];
                    if (Math.hypot(origN.x - e.x, origN.y - e.y) < 1) e = finalNodes[idx];
                });
                // Check if they match newly added nodes (which are after skeletonData.nodes)
                for (let idx = skeletonData.nodes.length; idx < finalNodes.length; idx++) {
                    const origAdded = addedNodes![idx - skeletonData.nodes.length];
                    if (Math.hypot(origAdded.x - s.x, origAdded.y - s.y) < 1) s = finalNodes[idx];
                    if (Math.hypot(origAdded.x - e.x, origAdded.y - e.y) < 1) e = finalNodes[idx];
                }

                return { ...line, start: s, end: e };
            });
        }

        if (deletedNodes && deletedNodes.length > 0) {
            const epsilon = 1.0;
            finalLines = finalLines.filter(line => {
                const startIsDeleted = deletedNodes.some(idx => {
                    const node = finalNodes[idx];
                    return node && Math.hypot(line.start.x - node.x, line.start.y - node.y) < epsilon;
                });
                const endIsDeleted = deletedNodes.some(idx => {
                    const node = finalNodes[idx];
                    return node && Math.hypot(line.end.x - node.x, line.end.y - node.y) < epsilon;
                });

                // If the line is a ridge line, keep it even if it's connected to a deleted node
                // (It will point to the node's override position, keeping the ridge intact)
                if (line.type === 'ridge' && (startIsDeleted || endIsDeleted)) {
                    return true;
                }

                return !startIsDeleted && !endIsDeleted;
            });
        }

        const faces = calculateRoofFaces(screenPts, finalLines);

        return { lines: finalLines, nodes: finalNodes, faces };
    }

    // Default fallback handling for unanalyzed and flat roofs
    if (!shape) return { lines: [], nodes: [], faces: [] as { vertices: { x: number, y: number }[], azimuth: number, tilt: number }[] };
    if (shape === 'flat') return { lines: [], nodes: [], faces: [{ vertices: screenPts, azimuth: ridgeDirection || 0, tilt: 0 }] };

    const lines: Array<{ start: { x: number, y: number }, end: { x: number, y: number }, type: 'ridge' | 'valley' | 'hip' }> = [];
    const ridge = calculateRidgeLine(screenPts, shape, ridgeAngle, ridgeDirection);
    const center = calculatePolygonCenter(screenPts);

    if (shape === 'gable' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });
    } else if (shape === 'hip' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        screenPts.forEach((corner) => {
            const distToStart = Math.hypot(corner.x - ridge.start.x, corner.y - ridge.start.y);
            const distToEnd = Math.hypot(corner.x - ridge.end.x, corner.y - ridge.end.y);

            if (distToStart > 10 && distToEnd > 10) {
                lines.push({ start: center, end: corner, type: 'hip' });
            }
        });
    } else if (shape === 'shed' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });
    } else if (shape === 'gambrel' || shape === 'mansard') {
        if (ridge) {
            lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });
        }

        screenPts.forEach((vertex) => {
            lines.push({
                start: center,
                end: vertex,
                type: 'valley'
            });
        });

        screenPts.forEach((p, i) => {
            const next = screenPts[(i + 1) % screenPts.length];
            const midX = (p.x + next.x) / 2;
            const midY = (p.y + next.y) / 2;
            lines.push({
                start: center,
                end: { x: midX, y: midY },
                type: 'valley'
            });
        });
    } else if (ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        screenPts.forEach((vertex) => {
            lines.push({
                start: center,
                end: vertex,
                type: 'valley'
            });
        });
    }

    const faces = calculateRoofFaces(screenPts, lines);
    return { lines, nodes: [], faces };
};

export const calculateRoofFaces = (
    perimeter: { x: number, y: number }[],
    skeletonLines: { start: { x: number, y: number }, end: { x: number, y: number }, type: string }[]
): { vertices: { x: number, y: number }[], type?: string, azimuth: number, tilt: number }[] => {
    // This function takes the outer perimeter rings and the inner skeleton edges
    // and attempts to form closed polygonal faces for each roof segment.
    if (perimeter.length < 3) return [];
    if (skeletonLines.length === 0) return [{ vertices: perimeter, azimuth: 180, tilt: 20 }];

    // 1. Build a planar graph of all nodes (perimeter + skeleton) and edges
    const nodes: { x: number, y: number, edges: number[] }[] = [];
    const edges: { u: number, v: number }[] = [];

    const TOLERANCE = 1.0;

    const addNode = (p: { x: number, y: number }): number => {
        for (let i = 0; i < nodes.length; i++) {
            if (Math.hypot(nodes[i].x - p.x, nodes[i].y - p.y) < TOLERANCE) {
                return i;
            }
        }
        nodes.push({ x: p.x, y: p.y, edges: [] });
        return nodes.length - 1;
    };

    const addEdge = (u: number, v: number) => {
        if (u === v) return;
        // Check for duplicates
        for (const eIdx of nodes[u].edges) {
            const e = edges[eIdx];
            if ((e.u === u && e.v === v) || (e.u === v && e.v === u)) return;
        }
        const edgeIdx = edges.length;
        edges.push({ u, v });
        nodes[u].edges.push(edgeIdx);
        nodes[v].edges.push(edgeIdx);
    };

    // Add perimeter edges
    for (let i = 0; i < perimeter.length; i++) {
        const u = addNode(perimeter[i]);
        const v = addNode(perimeter[(i + 1) % perimeter.length]);
        addEdge(u, v);
    }

    // Add skeleton edges
    for (const line of skeletonLines) {
        const u = addNode(line.start);
        const v = addNode(line.end);
        addEdge(u, v);
    }

    // 2. Extract faces (polygons) from the planar graph using Half-Edge data structure
    const edgeAngle = (u: number, v: number) => Math.atan2(nodes[v].y - nodes[u].y, nodes[v].x - nodes[u].x);

    // Build directed half-edges
    const halfEdges: { u: number, v: number, angle: number, next: number, id: string, faceId?: number }[] = [];

    // Add all half-edges
    for (const edge of edges) {
        halfEdges.push({ u: edge.u, v: edge.v, angle: edgeAngle(edge.u, edge.v), next: -1, id: `${edge.u}->${edge.v}` });
        halfEdges.push({ u: edge.v, v: edge.u, angle: edgeAngle(edge.v, edge.u), next: -1, id: `${edge.v}->${edge.u}` });
    }

    // Sort outgoing edges counter-clockwise for each node
    const outgoing = new Map<number, number[]>();
    for (let i = 0; i < nodes.length; i++) outgoing.set(i, []);

    for (let i = 0; i < halfEdges.length; i++) {
        outgoing.get(halfEdges[i].u)!.push(i);
    }

    for (const [u, edgeIndices] of outgoing.entries()) {
        edgeIndices.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle);

        // Connect half-edges: the "next" of half-edge (v->u) is the edge (u->w) that is immediately CCW to (u->v)
        for (let i = 0; i < edgeIndices.length; i++) {
            const eIdx = edgeIndices[i];
            const currentEdge = halfEdges[eIdx];

            // Find the opposite half-edge v->u
            const oppositeIdx = halfEdges.findIndex(e => e.u === currentEdge.v && e.v === currentEdge.u);

            // The next edge for v->u is the one after u->v in CCW order around u
            const nextIdx = edgeIndices[(i + 1) % edgeIndices.length];
            if (oppositeIdx !== -1) {
                halfEdges[oppositeIdx].next = nextIdx;
            }
        }
    }

    // Traverse to find faces
    const faces: { vertices: { x: number, y: number }[], azimuth: number, tilt: number }[] = [];
    const usedHalfEdges = new Set<string>();

    for (let i = 0; i < halfEdges.length; i++) {
        if (usedHalfEdges.has(halfEdges[i].id)) continue;

        const cycle: number[] = [];
        let currIdx = i;
        let isClosed = false;

        // Traverse the boundary of a face
        while (!usedHalfEdges.has(halfEdges[currIdx].id)) {
            usedHalfEdges.add(halfEdges[currIdx].id);
            const edge = halfEdges[currIdx];
            cycle.push(edge.u);

            currIdx = edge.next;
            if (currIdx === i) {
                isClosed = true;
                break;
            }
            if (currIdx === -1) break; // Should not happen in a valid embedding
        }

        if (isClosed && cycle.length >= 3) {
            // Calculate signed area of the cycle to determine if it's an internal face or the external boundary
            let area = 0;
            for (let j = 0; j < cycle.length; j++) {
                const p1 = nodes[cycle[j]];
                const p2 = nodes[cycle[(j + 1) % cycle.length]];
                area += (p1.x * p2.y - p2.x * p1.y);
            }
            area = area / 2;

            // Positive area (CCW) is an internal face in our screen coordinate system (y goes down, but angles defined standard)
            // Or negative, depending on exactly how screen points map. Let's filter by area.
            // External face usually has very large negative area, while internal faces share the total positive area.
            // Actually, an easier way is to link faces back to the perimeter edge to find their azimuth.

            const vertices = cycle.map(idx => ({ x: nodes[idx].x, y: nodes[idx].y }));

            // Find if this face shares an edge with the original perimeter to calculate its outward Azimuth
            let perimeterEdgeRef: { u: { x: number, y: number }, v: { x: number, y: number } } | null = null;
            let longestPerimeterEdgeSq = -1;

            const isPointOnPerimeterEdge = (pt: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }) => {
                const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
                if (l2 === 0) return false;
                let t = ((pt.x - p1.x) * (p2.x - p1.x) + (pt.y - p1.y) * (p2.y - p1.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                return Math.hypot(pt.x - proj.x, pt.y - proj.y) < 2; // Tolerance
            };

            for (let j = 0; j < cycle.length; j++) {
                const u = nodes[cycle[j]];
                const v = nodes[cycle[(j + 1) % cycle.length]];

                for (let k = 0; k < perimeter.length; k++) {
                    const p1 = perimeter[k];
                    const p2 = perimeter[(k + 1) % perimeter.length];

                    if (isPointOnPerimeterEdge(u, p1, p2) && isPointOnPerimeterEdge(v, p1, p2)) {
                        const distSq = Math.pow(v.x - u.x, 2) + Math.pow(v.y - u.y, 2);
                        if (distSq > longestPerimeterEdgeSq) {
                            longestPerimeterEdgeSq = distSq;
                            // Match direction of the perimeter for outward normal calculation
                            const uAlongPerimeter = Math.hypot(u.x - p1.x, u.y - p1.y);
                            const vAlongPerimeter = Math.hypot(v.x - p1.x, v.y - p1.y);
                            if (uAlongPerimeter < vAlongPerimeter) {
                                perimeterEdgeRef = { u, v };
                            } else {
                                perimeterEdgeRef = { u: v, v: u };
                            }
                        }
                    }
                }
            }

            // Exclude external face. The external face usually has the opposite winding order (thus opposite area sign) 
            // of the internal faces, and its absolute area is often much larger or different.
            // A safer heuristic for internal faces: their area is bounded and we just use the absolute value.
            // Actually, the external face in a planar graph of a simple polygon bounded by its perimeter 
            // is exactly the one that represents the 'outside'. We can identify it because it will have a negative area 
            // if the internal ones are positive, or vice versa. 
            // We can also just ignore the face that contains ALL perimeter vertices AND has the wrong winding order.
            const absArea = Math.abs(area);
            if (absArea > 5) { // Minimum area threshold to ignore degenerate slivers
                // Is this the external face? The external face in CCW half-edge traversal of a CCW polygon is CW, so area < 0.
                // In canvas (Y-down), perimeter is usually CW. Half-edge CCW traversal means internal faces are CCW (area < 0).
                // Let's just track all faces that have a valid azimuth (i.e., touching the perimeter) 
                // and if we get too many faces we might need to filter. For now, absArea > 5 is a good start.

                let deg = 180; // Default
                if (perimeterEdgeRef) {
                    const angle = Math.atan2(perimeterEdgeRef.v.y - perimeterEdgeRef.u.y, perimeterEdgeRef.v.x - perimeterEdgeRef.u.x);
                    let outwardAngle = angle + Math.PI / 2; // Right turn is outward if CW
                    deg = outwardAngle * (180 / Math.PI);
                    deg = (deg + 90) % 360;
                    if (deg < 0) deg += 360;
                }

                // Temporary check to prevent the giant external face from being added:
                // An internal face's absolute area must be smaller than the total area of the perimeter.
                // But we don't have total area computed here easily, so we just add it and we will filter later if needed.
                faces.push({
                    vertices,
                    area, // pass area for post-filtering
                    azimuth: Math.round(deg),
                    tilt: 20
                } as any);
            }
        }
    }

    // Filter out the external face(s). 
    // In a connected planar graph, exactly one face is the "external" face.
    // By convention of our half-edge CCW traversal, the external face traverses its boundary clockwise,
    // so its signed area will be opposite to the internal faces. 
    // Usually, the absolute area of the external face is also strictly larger than any internal face,
    // and often larger than the sum of all internal faces (depending on how coordinates are defined).
    // Let's sort by absolute area and assume the one with the biggest absolute area is the external one if its sign is different,
    // or just the largest one if it contains the entire bounding box.
    // Actually, a robust test is: internal faces have area > 0 (if CCW in standard coordinates, Y-up)
    // In our canvas (Y-down), CCW in screen coordinates means area < 0.
    // Let's just remove the single face with the largest absolute area, as it represents the outer boundary.
    if (faces.length > 1) {
        let maxAreaIdx = -1;
        let maxArea = -1;
        for (let i = 0; i < faces.length; i++) {
            const absA = Math.abs((faces[i] as any).area);
            if (absA > maxArea) {
                maxArea = absA;
                maxAreaIdx = i;
            }
        }
        if (maxAreaIdx !== -1) {
            faces.splice(maxAreaIdx, 1);
        }
    }

    // Clean up temporary 'area' property and return
    const finalFaces = faces.map(f => {
        const { area, ...rest } = f as any;
        return rest;
    });

    // In case graph extraction failed or returned nothing (e.g. malformed skeleton), fallback to basic.
    if (finalFaces.length === 0) {
        return [{ vertices: perimeter, azimuth: 180, tilt: 20 }];
    }

    return finalFaces;
};

