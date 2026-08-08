package com.triadfs.common.util;

public final class MemoryProbe {
    private MemoryProbe() {
    }

    public static long usedBytes() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }
}