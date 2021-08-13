#include "StormLib.h"
#include <emscripten/bind.h>

using namespace emscripten;

class EmPtr {
  public:
    void* ptr = nullptr;

    EmPtr() {}

    size_t getAddr() const {
      return (size_t)ptr;
    }

    bool isNull() const {
      return ptr == nullptr;
    }
};

class EmVoidPtr : public EmPtr {
  public:
    EmVoidPtr() : EmPtr() {}
};

class EmUint32Ptr : public EmPtr {
  public:
    EmUint32Ptr() : EmPtr() {
      uint32_t value = 0;
      ptr = &value;
    }

    uint32_t toJS() const {
      return *(uint32_t*)ptr;
    }
};

class EmBuf {
  public:
    uint32_t size;
    uint8_t* ptr;

    EmBuf(uint32_t s) {
      size = s;
      ptr = new uint8_t[s];
    }

    ~EmBuf() {
      delete ptr;
    }

    uint32_t getSize() const {
      return size;
    }

    uint32_t getPtr() {
      return (uint32_t)ptr;
    }

    val toJS() {
      return val(typed_memory_view(size, ptr));
    }
};

class EmStr {
  public:
    uint32_t size;
    char* ptr;

    EmStr(uint32_t s) {
      size = s;
      ptr = new char[s];
    }

    ~EmStr() {
      delete ptr;
    }

    uint32_t getSize() const {
      return size;
    }

    uint32_t getPtr() {
      return (uint32_t)ptr;
    }

    val toJS() {
      return val(std::string(ptr));
    }
};

bool EmSFileCloseArchive(EmPtr& pMpq) {
  return SFileCloseArchive(pMpq.ptr);
}

bool EmSFileCloseFile(EmPtr& pFile) {
  return SFileCloseFile(pFile.ptr);
}

bool EmSFileFindClose(EmPtr& pFind) {
  return SFileFindClose(pFind.ptr);
}

EmPtr EmSFileFindFirstFile(EmPtr& pMpq, const std::string& sMask, SFILE_FIND_DATA& pFindFileData, const std::string& sListFile) {
  EmPtr* pFind = new EmPtr;
  pFind->ptr = SFileFindFirstFile(pMpq.ptr, sMask.c_str(), &pFindFileData, sListFile.c_str());
  return *pFind;
}

std::string EmSFileFindDataGetFileName(const SFILE_FIND_DATA& data) {
  return data.cFileName;
}

std::string EmSFileFindDataGetPlainName(const SFILE_FIND_DATA& data) {
  return data.szPlainName;
}

val EmSFileFindDataToJS(const SFILE_FIND_DATA& data) {
  val obj = val::object();

  obj.set("fileName", val(data.cFileName));
  obj.set("plainName", std::string(data.szPlainName));
  obj.set("hashIndex", data.dwHashIndex);
  obj.set("blockIndex", data.dwBlockIndex);
  obj.set("fileSize", data.dwFileSize);
  obj.set("compSize", data.dwCompSize);
  obj.set("fileTimeLo", data.dwFileTimeLo);
  obj.set("fileTimeHi", data.dwFileTimeHi);
  obj.set("locale", data.lcLocale);

  return obj;
}

bool EmSFileFindNextFile(EmPtr& pFind, SFILE_FIND_DATA& pFindFileData) {
  return SFileFindNextFile(pFind.ptr, &pFindFileData);
}

bool EmSFileGetFileName(EmPtr& pFile, EmStr& sName) {
  return SFileGetFileName(pFile.ptr, sName.ptr);
}

uint32_t EmSFileGetFileSize(EmPtr& pFile, EmPtr& pFileSizeHigh) {
  return SFileGetFileSize(pFile.ptr, static_cast<uint32_t*>(pFileSizeHigh.ptr));
}

bool EmSFileHasFile(EmPtr& pMpq, const std::string& sFileName) {
  return SFileHasFile(pMpq.ptr, sFileName.c_str());
}

bool EmSFileOpenArchive(const std::string& sMpqName, uint32_t uPriority, uint32_t uFlags, EmPtr& pMpq) {
  return SFileOpenArchive(sMpqName.c_str(), uPriority, uFlags, &pMpq.ptr);
}

bool EmSFileOpenPatchArchive(EmPtr& pMpq, const std::string& sMpqName, const std::string& sPatchPathPrefix, uint32_t uFlags) {
  return SFileOpenPatchArchive(pMpq.ptr, sMpqName.c_str(), sPatchPathPrefix.c_str(), uFlags);
}

bool EmSFileOpenFileEx(EmPtr& pMpq, const std::string& sFileName, uint32_t uSearchScope, EmPtr& pFile) {
  return SFileOpenFileEx(pMpq.ptr, sFileName.c_str(), uSearchScope, &pFile.ptr);
}

bool EmSFileReadFile(EmPtr& pFile, EmBuf& bData, uint32_t uToRead, EmPtr& pRead, EmPtr& pOverlapped) {
  return SFileReadFile(pFile.ptr, bData.ptr, uToRead, static_cast<uint32_t*>(pRead.ptr), static_cast<uint32_t*>(pOverlapped.ptr));
}

bool EmSFileFlushArchive(EmPtr& pMpq) {
  return SFileFlushArchive(pMpq.ptr);
}

bool EmSFileCompactArchive(EmPtr& pMpq, const std::string& szListFile, uint32_t bReserved) {
  if(szListFile.length() == 0) {
    return SFileCompactArchive(pMpq.ptr, nullptr, (bool)0);
  }
  else {
    return SFileCompactArchive(pMpq.ptr, szListFile.c_str(), (bool)0);
  }
}

bool EmSFileSignArchive(EmPtr& pMpq, uint32_t dwSignatureType) {
  return SFileSignArchive(pMpq.ptr, dwSignatureType);
}

bool EmSFileWriteFileFromFS(EmPtr& pFile, const std::string& sWrittenFilePath, uint32_t dwSize, uint32_t dwCompression) {
  FILE *fptr;
  char *buffer;
  bool result;

  buffer = (char *)malloc(dwSize+1);
  fptr = fopen(sWrittenFilePath.c_str(), "rb");
  fread(buffer, dwSize, 1, fptr);
  fclose(fptr);
  result = SFileWriteFile(pFile.ptr, buffer, dwSize, dwCompression);
  free(buffer);
  return result;
}

bool EmSFileWriteFile(EmPtr& pFile, EmBuf& bData, uint32_t dwSize, uint32_t dwCompression) {
  return SFileWriteFile(pFile.ptr, bData.ptr, dwSize, dwCompression);
}

bool EmSFileFinishFile(EmPtr& pFile) {
  return SFileFinishFile(pFile.ptr);
}

bool EmSFileRemoveFile(EmPtr& hMpq, const std::string& szFileName, uint32_t dwSearchScope) {
  return SFileRemoveFile(hMpq.ptr, szFileName.c_str(), dwSearchScope);
}

bool EmSFileRenameFile(EmPtr& hMpq, const std::string& szOldFileName, const std::string& szNewFileName) {
  return SFileRenameFile(hMpq.ptr, szOldFileName.c_str(), szNewFileName.c_str());
}

bool EmSFileExtractFile(EmPtr& hMpq, const std::string& szToExtract, const std::string& szExtracted, uint32_t dwSearchScope) {
  return SFileExtractFile(hMpq.ptr, szToExtract.c_str(), szExtracted.c_str(), dwSearchScope);
}

uint32_t EmSFileVerifyFile(EmPtr& hMpq, const std::string& szFileName, uint32_t dwFlags) {
  return SFileVerifyFile(hMpq.ptr, szFileName.c_str(), dwFlags);
}

uint32_t EmSFileVerifyArchive(EmPtr& hMpq) {
  return SFileVerifyArchive(hMpq.ptr);
}

bool EmSFileIsPatchedArchive(EmPtr& hMpq) {
  return SFileIsPatchedArchive(hMpq.ptr);
}

bool EmSFileCreateArchive(const std::string& sMpqName, uint32_t dwCreateFlags, uint32_t dwMaxFileCount, EmPtr& hMpq) {
  return SFileCreateArchive(sMpqName.c_str(), dwCreateFlags, dwMaxFileCount, &hMpq.ptr);
}

bool EmSFileSetMaxFileCount(EmPtr& hMpq, uint32_t dwMaxFileCount) {
  return SFileSetMaxFileCount(hMpq.ptr, dwMaxFileCount);
}

bool EmSFileSetFileLocale(EmPtr& hFile, uint32_t lcid) {
  return SFileSetFileLocale(hFile.ptr, lcid);
}

bool EmSFileCreateFile(EmPtr& hMpq, const std::string& szArchivedName, double fileTime, uint32_t fileSize, uint32_t lcid, uint32_t dwFlags, EmPtr& pFile) {
  return SFileCreateFile(hMpq.ptr, szArchivedName.c_str(), (uint64_t)fileTime, fileSize, lcid, dwFlags, &pFile.ptr);
}

bool EmSFileAddFileEx(EmPtr& hMpq, const std::string& szFileName, const std::string& szArchivedName, uint32_t dwFlags, uint32_t dwCompression, uint32_t dwCompressionNext) {
  return SFileAddFileEx(hMpq.ptr, szFileName.c_str(), szArchivedName.c_str(), dwFlags, dwCompression, dwCompressionNext);
}

uint32_t EmSFileSetFilePointer(EmPtr& pFile, uint32_t uPos, EmPtr& pPosHigh, uint32_t uMoveMethod) {
  return SFileSetFilePointer(pFile.ptr, uPos, static_cast<int32_t*>(pPosHigh.ptr), uMoveMethod);
}

uint32_t EmSFileAddListFile(EmPtr& hMpq, const std::string& szListFile) {
  return SFileAddListFile(hMpq.ptr, szListFile.c_str());
}

uint32_t EmSFileEnumLocales(EmPtr& hMpq, const std::string& szFileName, EmPtr& plcLocales, EmPtr& pdwMaxLocales, uint32_t dwSearchScope) {
  return SFileEnumLocales(hMpq.ptr, szFileName.c_str(), static_cast<uint32_t*>(plcLocales.ptr), static_cast<uint32_t*>(pdwMaxLocales.ptr), dwSearchScope);
}

uint32_t EmSFileSetLocale(uint32_t lcid) {
  return SFileSetLocale(lcid);
}

uint32_t EmSFileGetLocale() {
  return SFileGetLocale();
}

bool EmSFileCreateArchive2(const std::string& sMpqName, val vCreateInfo, EmPtr& hMpq) {
  SFILE_CREATE_MPQ * pCreateInfo = new SFILE_CREATE_MPQ;
  pCreateInfo -> cbSize = (uint32_t)sizeof(SFILE_CREATE_MPQ);
  pCreateInfo -> dwMpqVersion = vCreateInfo["dwMpqVersion"].as<uint32_t>();
  pCreateInfo -> pvUserData = nullptr;
  pCreateInfo -> cbUserData = 0;
  pCreateInfo -> dwStreamFlags = vCreateInfo["dwStreamFlags"].as<uint32_t>();
  pCreateInfo -> dwFileFlags1 = vCreateInfo["dwFileFlags1"].as<uint32_t>();
  pCreateInfo -> dwFileFlags2 = vCreateInfo["dwFileFlags2"].as<uint32_t>();
  pCreateInfo -> dwFileFlags3 = vCreateInfo["dwFileFlags3"].as<uint32_t>();
  pCreateInfo -> dwAttrFlags = vCreateInfo["dwAttrFlags"].as<uint32_t>();
  pCreateInfo -> dwSectorSize = vCreateInfo["dwSectorSize"].as<uint32_t>();
  pCreateInfo -> dwRawChunkSize = vCreateInfo["dwRawChunkSize"].as<uint32_t>();
  pCreateInfo -> dwMaxFileCount = vCreateInfo["dwMaxFileCount"].as<uint32_t>();
  return SFileCreateArchive2(sMpqName.c_str(), pCreateInfo, &hMpq.ptr);
}

bool EmSFileGetFileInfo(EmPtr& hMpq, uint32_t InfoClass, EmBuf& pvFileInfo, uint32_t cbFileInfo, EmPtr& pcbLengthNeeded) {
  return SFileGetFileInfo(hMpq.ptr, (SFileInfoClass)InfoClass, pvFileInfo.ptr, cbFileInfo, static_cast<uint32_t*>(pcbLengthNeeded.ptr));
}

EMSCRIPTEN_BINDINGS(EmStormLib) {
  class_<EmBuf>("Buf")
    .constructor<uint32_t>()
    .function("getSize", &EmBuf::getSize)
    .function("toJS", &EmBuf::toJS)
    .function("getPtr", &EmBuf::getPtr);

  class_<EmPtr>("Ptr")
    .constructor()
    .function("getAddr", &EmPtr::getAddr)
    .function("isNull", &EmPtr::isNull);

  class_<EmStr>("Str")
    .constructor<uint32_t>()
    .function("getSize", &EmStr::getSize)
    .function("toJS", &EmStr::toJS)
    .function("getPtr", &EmStr::getPtr);

  class_<EmVoidPtr, base<EmPtr>>("VoidPtr")
    .constructor();

  class_<EmUint32Ptr, base<EmPtr>>("Uint32Ptr")
    .constructor()
    .function("toJS", &EmUint32Ptr::toJS);

  class_<SFILE_FIND_DATA>("SFileFindData")
    .constructor()
    .property("fileName", &EmSFileFindDataGetFileName)
    .property("plainName", &EmSFileFindDataGetPlainName)
    .property("hashIndex", &SFILE_FIND_DATA::dwHashIndex)
    .property("blockIndex", &SFILE_FIND_DATA::dwBlockIndex)
    .property("fileSize", &SFILE_FIND_DATA::dwFileSize)
    .property("compSize", &SFILE_FIND_DATA::dwCompSize)
    .property("fileTimeLo", &SFILE_FIND_DATA::dwFileTimeLo)
    .property("fileTimeHi", &SFILE_FIND_DATA::dwFileTimeHi)
    .property("locale", &SFILE_FIND_DATA::lcLocale)
    .function("toJS", &EmSFileFindDataToJS);

  function("GetLastError", &GetLastError);

  function("SFileCloseArchive", &EmSFileCloseArchive);
  function("SFileCloseFile", &EmSFileCloseFile);
  function("SFileFindClose", &EmSFileFindClose);
  function("SFileFindFirstFile", &EmSFileFindFirstFile);
  function("SFileFindNextFile", &EmSFileFindNextFile);
  function("SFileGetFileName", &EmSFileGetFileName);
  function("SFileGetFileSize", &EmSFileGetFileSize);
  function("SFileHasFile", &EmSFileHasFile);
  function("SFileOpenArchive", &EmSFileOpenArchive);
  function("SFileOpenPatchArchive", &EmSFileOpenPatchArchive);
  function("SFileOpenFileEx", &EmSFileOpenFileEx);
  function("SFileReadFile", &EmSFileReadFile);
  function("SFileRemoveFile", &EmSFileRemoveFile);
  function("SFileRenameFile", &EmSFileRenameFile);
  function("SFileExtractFile", &EmSFileExtractFile);
  function("SFileSetFileLocale", &EmSFileSetFileLocale);
  function("SFileVerifyFile", &EmSFileVerifyFile);
  function("SFileAddFileEx", &EmSFileAddFileEx);
  function("SFileCreateFile", &EmSFileCreateFile);
  function("SFileSetFilePointer", &EmSFileSetFilePointer);
  function("SFileWriteFile", &EmSFileWriteFile);
  function("SFileFinishFile", &EmSFileFinishFile);
  function("SFileFlushArchive", &EmSFileFlushArchive);
  function("SFileCompactArchive", &EmSFileCompactArchive);
  function("SFileSignArchive", &EmSFileSignArchive);
  function("SFileVerifyArchive", &EmSFileVerifyArchive);
  function("SFileSetMaxFileCount", &EmSFileSetMaxFileCount);
  function("SFileCreateArchive", &EmSFileCreateArchive);
  function("SFileCreateArchive2", &EmSFileCreateArchive2);
  function("SFileAddListFile", &EmSFileAddListFile);
  function("SFileEnumLocales", &EmSFileEnumLocales);
  function("SFileSetLocale", &EmSFileSetLocale);
  function("SFileGetLocale", &EmSFileGetLocale);
  function("SFileIsPatchedArchive", &EmSFileIsPatchedArchive);
  function("SFileGetFileInfo", &EmSFileGetFileInfo);

  constant("ERROR_FILE_NOT_FOUND", ERROR_FILE_NOT_FOUND);
  constant("ERROR_NO_MORE_FILES", ERROR_NO_MORE_FILES);
  constant("ERROR_INSUFFICIENT_BUFFER", ERROR_INSUFFICIENT_BUFFER);
  constant("FILE_BEGIN", FILE_BEGIN);
  constant("MAX_PATH", MAX_PATH);
  constant("SFILE_INVALID_SIZE", SFILE_INVALID_SIZE);
  constant("STREAM_FLAG_READ_ONLY", STREAM_FLAG_READ_ONLY);
  constant("HASH_TABLE_SIZE_MIN", HASH_TABLE_SIZE_MIN);
  constant("HASH_TABLE_SIZE_MAX", HASH_TABLE_SIZE_MAX);
}
