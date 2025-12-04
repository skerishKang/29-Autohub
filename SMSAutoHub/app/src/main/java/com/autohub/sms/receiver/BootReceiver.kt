package com.autohub.sms.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.autohub.sms.worker.AppInitializationWorker
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {
    
    @Inject
    lateinit var workManager: WorkManager
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON" -> {
                handleBootCompleted(context)
            }
        }
    }
    
    private fun handleBootCompleted(context: Context) {
        Timber.d("Boot completed - initializing AutoHub SMS service")
        
        try {
            // 앱 초기화 작업 예약
            val initializationRequest = OneTimeWorkRequestBuilder<AppInitializationWorker>()
                .addTag("app-initialization")
                .build()
            
            workManager.enqueue(initializationRequest)
            
            // SMS 모니터 서비스 시작
            startSmsMonitorService(context)
            
        } catch (e: Exception) {
            Timber.e(e, "Error during boot initialization")
        }
    }
    
    private fun startSmsMonitorService(context: Context) {
        try {
            val serviceIntent = Intent(context, com.autohub.sms.service.SmsMonitorService::class.java)
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            
            Timber.d("SMS monitor service started")
        } catch (e: Exception) {
            Timber.e(e, "Error starting SMS monitor service")
        }
    }
}