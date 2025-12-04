package com.autohub.sms.ui

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.autohub.sms.R
import com.autohub.sms.databinding.ActivityMainBinding
import com.autohub.sms.ui.viewmodel.MainViewModel
import com.autohub.sms.utils.PermissionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    
    @Inject
    lateinit var permissionManager: PermissionManager
    
    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupNavigation()
        setupObservers()
        checkPermissions()
        
        Timber.d("MainActivity created")
    }
    
    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController
        
        // AppBar 설정
        val appBarConfiguration = AppBarConfiguration(
            setOf(R.id.navigation_home, R.id.navigation_settings, R.id.navigation_statistics)
        )
        
        setupActionBarWithNavController(navController, appBarConfiguration)
        binding.bottomNavigationView.setupWithNavController(navController)
    }
    
    private fun setupObservers() {
        // 권한 상태 관찰
        viewModel.permissionsGranted.observe(this) { granted ->
            if (granted) {
                startSmsService()
            } else {
                requestPermissions()
            }
        }
        
        // SMS 데이터 관찰
        viewModel.smsCount.observe(this) { count ->
            updateBadge(count)
        }
        
        // 앱 상태 관찰
        viewModel.appState.observe(this) { state ->
            handleAppState(state)
        }
    }
    
    private fun checkPermissions() {
        lifecycleScope.launch {
            val hasPermissions = permissionManager.hasAllPermissions()
            viewModel.setPermissionsGranted(hasPermissions)
            
            if (hasPermissions) {
                Timber.d("All permissions granted")
                startSmsService()
            } else {
                Timber.d("Requesting permissions")
                requestPermissions()
            }
        }
    }
    
    private fun requestPermissions() {
        permissionManager.requestPermissions(this) { granted ->
            viewModel.setPermissionsGranted(granted)
            if (granted) {
                startSmsService()
            } else {
                showPermissionDeniedDialog()
            }
        }
    }
    
    private fun startSmsService() {
        lifecycleScope.launch {
            try {
                // SMS 모니터 서비스 시작
                com.autohub.sms.service.SmsMonitorService.startService(this@MainActivity)
                
                // 서비스 상태 확인
                viewModel.checkServiceStatus()
                
                Timber.d("SMS service started successfully")
            } catch (e: Exception) {
                Timber.e(e, "Error starting SMS service")
                viewModel.setError("서비스 시작 실패: ${e.message}")
            }
        }
    }
    
    private fun handleAppState(state: MainViewModel.AppState) {
        when (state) {
            is MainViewModel.AppState.Loading -> {
                showLoading()
            }
            is MainViewModel.AppState.Ready -> {
                hideLoading()
            }
            is MainViewModel.AppState.Error -> {
                hideLoading()
                showError(state.message)
            }
        }
    }
    
    private fun showLoading() {
        // 로딩 인디케이터 표시
        binding.progressBar.visibility = android.view.View.VISIBLE
    }
    
    private fun hideLoading() {
        binding.progressBar.visibility = android.view.View.GONE
    }
    
    private fun showError(message: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("오류")
            .setMessage(message)
            .setPositiveButton("확인") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }
    
    private fun showPermissionDeniedDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("권한 필요")
            .setMessage("SMS 자동화 기능을 사용하려면 권한이 필요합니다. 설정에서 권한을 허용해주세요.")
            .setPositiveButton("설정으로 이동") { _, _ ->
                openAppSettings()
            }
            .setNegativeButton("취소") { dialog, _ ->
                dialog.dismiss()
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun openAppSettings() {
        val intent = android.content.Intent(
            android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            android.net.Uri.fromParts("package", packageName, null)
        )
        startActivity(intent)
    }
    
    private fun updateBadge(count: Int) {
        // 바텀 네비게이션 배지 업데이트 (읽지 않은 SMS 수)
        try {
            val badge = binding.bottomNavigationView.getOrCreateBadge(R.id.navigation_home)
            badge.number = count
            badge.isVisible = count > 0
        } catch (e: Exception) {
            Timber.e(e, "Error updating badge")
        }
    }
    
    override fun onResume() {
        super.onResume()
        checkPermissions()
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        permissionManager.handlePermissionResult(requestCode, permissions, grantResults)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Timber.d("MainActivity destroyed")
    }
}