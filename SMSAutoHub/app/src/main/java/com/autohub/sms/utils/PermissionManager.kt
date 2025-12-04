package com.autohub.sms.utils

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PermissionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        const val REQUEST_CODE_PERMISSIONS = 1001
        
        // 필수 권한 목록
        val REQUIRED_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.POST_NOTIFICATIONS,
                Manifest.permission.INTERNET,
                Manifest.permission.ACCESS_NETWORK_STATE,
                Manifest.permission.RECEIVE_BOOT_COMPLETED
            )
        } else {
            arrayOf(
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.INTERNET,
                Manifest.permission.ACCESS_NETWORK_STATE,
                Manifest.permission.RECEIVE_BOOT_COMPLETED
            )
        }
        
        // 선택적 권한 목록
        val OPTIONAL_PERMISSIONS = arrayOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
    }
    
    /**
     * 모든 필수 권한이 있는지 확인
     */
    fun hasAllPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * 특정 권한이 있는지 확인
     */
    fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * 권한 요청 결과 처리
     */
    fun handlePermissionResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            val deniedPermissions = mutableListOf<String>()
            
            for (i in permissions.indices) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    deniedPermissions.add(permissions[i])
                }
            }
            
            if (deniedPermissions.isEmpty()) {
                Timber.d("All permissions granted")
            } else {
                Timber.w("Some permissions denied: $deniedPermissions")
                
                // 사용자가 권한을 영구적으로 거부한 경우
                val shouldShowRationale = deniedPermissions.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(
                        context as Activity,
                        permission
                    )
                }
                
                if (!shouldShowRationale) {
                    Timber.w("Permission permanently denied, user should go to settings")
                }
            }
        }
    }
    
    /**
     * Activity에서 권한 요청
     */
    fun requestPermissions(activity: Activity, onResult: (Boolean) -> Unit) {
        if (hasAllPermissions()) {
            onResult(true)
            return
        }
        
        ActivityCompat.requestPermissions(
            activity,
            REQUIRED_PERMISSIONS,
            REQUEST_CODE_PERMISSIONS
        )
        
        // 결과는 onRequestPermissionsResult에서 처리해야 함
        // 여기서는 단순히 요청만 하고 결과는 콜백으로 전달하지 않음
    }
    
    /**
     * Fragment에서 권한 요청
     */
    fun requestPermissions(fragment: Fragment, onResult: (Boolean) -> Unit) {
        if (hasAllPermissions()) {
            onResult(true)
            return
        }
        
        fragment.requestPermissions(
            REQUIRED_PERMISSIONS,
            REQUEST_CODE_PERMISSIONS
        )
    }
    
    /**
     * AppCompatActivity에서 권한 요청 (ActivityResultLauncher 사용)
     */
    fun requestPermissionsWithLauncher(
        activity: AppCompatActivity,
        onResult: (Boolean) -> Unit
    ) {
        if (hasAllPermissions()) {
            onResult(true)
            return
        }
        
        val launcher = activity.registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            val allGranted = permissions.values.all { it }
            onResult(allGranted)
            
            if (allGranted) {
                Timber.d("All permissions granted via launcher")
            } else {
                val denied = permissions.filterValues { !it }.keys
                Timber.w("Some permissions denied via launcher: $denied")
            }
        }
        
        launcher.launch(REQUIRED_PERMISSIONS.toSet())
    }
    
    /**
     * 권한 설명 표시가 필요한지 확인
     */
    fun shouldShowRationale(activity: Activity): Boolean {
        return REQUIRED_PERMISSIONS.any { permission ->
            ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
        }
    }
    
    /**
     * 권한 설정 화면으로 이동
     */
    fun openAppSettings(context: Context) {
        val intent = android.content.Intent(
            android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            android.net.Uri.fromParts("package", context.packageName, null)
        )
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
    
    /**
     * 권한 상태 가져오기
     */
    fun getPermissionStatus(): Map<String, Boolean> {
        val status = mutableMapOf<String, Boolean>()
        
        REQUIRED_PERMISSIONS.forEach { permission ->
            status[permission] = hasPermission(permission)
        }
        
        OPTIONAL_PERMISSIONS.forEach { permission ->
            status[permission] = hasPermission(permission)
        }
        
        return status
    }
    
    /**
     * 누락된 권한 목록 가져오기
     */
    fun getMissingPermissions(): List<String> {
        return REQUIRED_PERMISSIONS.filter { !hasPermission(it) }
    }
    
    /**
     * 부여된 권한 목록 가져오기
     */
    fun getGrantedPermissions(): List<String> {
        return REQUIRED_PERMISSIONS.filter { hasPermission(it) }
    }
    
    /**
     * 특정 권한 그룹 확인
     */
    fun hasSmsPermissions(): Boolean {
        return hasPermission(Manifest.permission.RECEIVE_SMS) &&
               hasPermission(Manifest.permission.READ_SMS)
    }
    
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true // Android 12 이하에서는 기본적으로 허용됨
        }
    }
    
    fun hasNetworkPermissions(): Boolean {
        return hasPermission(Manifest.permission.INTERNET) &&
               hasPermission(Manifest.permission.ACCESS_NETWORK_STATE)
    }
    
    fun hasBootPermission(): Boolean {
        return hasPermission(Manifest.permission.RECEIVE_BOOT_COMPLETED)
    }
    
    /**
     * 권한 요청에 필요한 런처 정보 생성
     */
    fun createPermissionRationale(): String {
        val missingPermissions = getMissingPermissions()
        val permissionNames = missingPermissions.map { permission ->
            when (permission) {
                Manifest.permission.RECEIVE_SMS -> "SMS 수신"
                Manifest.permission.READ_SMS -> "SMS 읽기"
                Manifest.permission.POST_NOTIFICATIONS -> "알림"
                Manifest.permission.INTERNET -> "인터넷"
                Manifest.permission.ACCESS_NETWORK_STATE -> "네트워크 상태"
                Manifest.permission.RECEIVE_BOOT_COMPLETED -> "부팅 완료"
                else -> permission
            }
        }
        
        return buildString {
            append("AutoHub SMS가 다음 권한이 필요합니다:\n\n")
            permissionNames.forEach { name ->
                append("• $name\n")
            }
            append("\n이 권한들은 SMS 자동화 서비스를 위해 필수적입니다.")
        }
    }
}